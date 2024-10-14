import jwt, { decode } from "jsonwebtoken";
import { authenticator, totp } from 'otplib';
import QRCode from 'qrcode';

import recaptchaAPI from "../api/recaptchaAPI.js";

import { BASE_URL, JWT_SECRET } from "../utils/config.js";

import {
  checkAccountLock,
  updateLoginAttempts,
} from "../services/authService.js";

import { sendVerificationEmail } from "../utils/emailSender.js";

import Usuario from "../models/usuario.js";

export const registerUser = async (req, res) => {
  const { nombre, email, telefono, password } = req.body;

  if (!nombre || !email || !telefono || !password) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    const emailExists = await Usuario.findOne({
      where: {
        email,
      },
    });

    if (emailExists) {
      return res.status(400).json({
        message: "El correo electrónico ya está registrado, intenta con otro.",
      });
    }

    const userData = {
      nombre,
      email,
      telefono,
      password,
    };

    const newUser = await Usuario.create(userData);
    console.log(newUser.dataValues);

    // Implementar JWT
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: 60 });

    // Enviar correo de verificación
    const verificationLink = `${BASE_URL}/auth/verify-email?token=${token}`;
    const htmlContent = `<p>Hola ${nombre}, por favor verifica tu correo haciendo clic en el siguiente enlace: <a href="${verificationLink}">Verificar correo</a></p>`;

    const isEmailShipped = await sendVerificationEmail(email, "Verifica tu correo electrónico", htmlContent);

    console.log(isEmailShipped);

    res.status(201).json({
      message: "Usuario registrado exitosamente",
    });
  } catch (error) {
    res.status(400).json({
      message: "Error al registrar el usuario",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  // || !tokenCaptcha
  if (!email || !password) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    // if (isLocked) {
    //   return res.status(403).json({ message: 'Cuenta bloqueada temporalmente. Intenta de nuevo más tarde.' });
    // }

    // const responseCaptcha = await recaptchaAPI.post('/siteverify', {}, {
    //   params: {
    //     secret: RECAPTCHA_SECRET_KEY,
    //     response: tokenCaptcha
    //   }
    // });

    // const isValidCaptcha = responseCaptcha.data.success;

    // if(!isValidCaptcha) throw new Error('Fallo en la verificación del reCAPTCHA, inténtalo de nuevo.')

    let userFound = await Usuario.findOne({
      where: {
        email,
      },
    });

    if (!userFound) throw new Error(`El correo electrónico ${email} no existe.`);
    if (!userFound.dataValues.isEmailVerified) throw new Error(`Necesitas verificar tu correo antes de iniciar sesión.`);

    // Verificar si la cuenta está bloqueada en la base de datos
    const isLocked = await checkAccountLock(email);

    if (isLocked && isLocked?.timeRemaining > 0) {
      return res.status(403).json({
        message: "Cuenta bloqueada temporalmente.",
        timeRemaining: isLocked.timeRemaining, // Enviar el tiempo restante en segundos
      });
    }

    const isPasswordCorrect = await userFound.validarPassword(password);

    userFound = structuredClone(userFound.dataValues);

    if (!isPasswordCorrect) {
      const attempts = await updateLoginAttempts(email);

      throw new Error(
        `El correo electrónico o contraseña no coinciden. Intentos restantes: ${
          5 - attempts
        }`
      );
    }

    await updateLoginAttempts(email, true);

    delete userFound.password;

    const token = jwt.sign(
      {
        user: userFound,
        message: "Mensaje secreto",
      },
      "SecretoLa",
      { expiresIn: 18000 } // 5h
    );

    return res.status(200).json({
      token,
    });
  } catch (error) {
    console.log(error.details);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query; // Obtener el token de la URL

  if (!token) {
    return res.status(400).send("No se proporcionó ningún token.");
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    // // Buscar al usuario en la base de datos
    const user = await Usuario.findOne({ where: { email: decoded.email } });

    if (!user) {
      return res.status(400).send("Usuario no encontrado.");
    }

    console.log(user.dataValues);

    // Actualiza el campo `emailVerified` del usuario
    await user.update({ isEmailVerified: true });

    res.send("Correo verificado exitosamente. Ya puedes iniciar sesión.");
  } catch (error) {
    res.status(400).send("Token inválido o expirado.");
  }
};

export const mfaSetup = async(req, res) => {
  try {
    // Generar un secreto TOTP
    const secret = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD';
    console.log({secret});

    // Crear la URL otpauth para Google Authenticator o cualquier app TOTP
    const otpauthURL = authenticator.keyuri('undecode0@hotmail.com', 'OlympusGymApp', secret); 

    // Usar async/await para generar el código QR como una promesa
    const qrCode = await QRCode.toDataURL(otpauthURL);

    // Enviar el secreto y el código QR como respuesta
    res.json({
      secret: secret,  // Este es el secreto que deberás almacenar en la base de datos
      qrCode: qrCode   // Este es el código QR que deberás mostrar en el frontend para que el usuario lo escanee
    });
  } catch (err) {
    // Manejo de errores
    console.error('Error generando el código QR:', err);
    res.status(500).json({ message: 'Error generando el código QR' });
  }
}

export const mfaVerify = async(req, res) => {
  const { token, secret } = req.body;

  const isValid = authenticator.verify({ token, secret });

  if (isValid) {
    return res.json({ message: 'MFA verificado correctamente' });
  } else {
    return res.status(400).json({ message: 'Código MFA inválido' });
  }
}


// export const verifyToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1]; // Obtener el token de la cabecera Authorization

//   if (!token) {
//     return res.status(401).json({
//       message: "No se proporcionó el token",
//     });
//   }

//   try {
//     // Verificar el token
//     const decoded = jwt.verify(token, JWT_SECRET);
//     req.user = decoded; // Adjuntar los datos decodificados (id y email) a req.user
//     next(); // Continuar con la solicitud
//   } catch (error) {
//     return res.status(401).json({
//       message: "Token inválido o expirado",
//       error: error.message,
//     });
//   }
// };



// Example
// export const nameFunction = async(req, res) => {}
