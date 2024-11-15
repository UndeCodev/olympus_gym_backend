import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import recaptchaAPI from "../api/recaptchaAPI.js";
import bcrypt from "bcrypt";

import { authenticator } from "otplib";
import { PrismaClient } from "@prisma/client";

import {
  BASE_URL,
  JWT_SECRET,
  MFA_SECRET,
  RECAPTCHA_SECRET_KEY,
} from "../utils/config.js";

const prisma = new PrismaClient();

import {
  loginAttempts,
  sendEmailByType,
  verifyAccountStatus,
} from "../services/authService.js";


export const registerUser = async (req, res) => {
  const { firstname, lastname, phone, birthdate, email, password } = req.body;

  try {
    const emailExists = await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (emailExists) {
      return res.status(400).json({
        message: `El correo electrónico ${email} ya está registrado, intenta con otro.`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      nombre: firstname,
      apellidos: lastname,
      telefono: phone,
      fecha_nacimiento: new Date(birthdate),
      email: email,
      contrasena: hashedPassword,
    };

    const newUser = await prisma.usuario.create({
      data: userData,
    });

    if (!newUser) {
      return res.status(500).json({
        message: `Hubo un problema al registrar el usuario, inténtalo de nuevo.`,
      });
    }

    const isEmailSent = await sendEmailByType(newUser.nombre, newUser.email, 'REGISTRO_USUARIO');

    if (!isEmailSent) {
      return res.status(500).json({
        message: "Hubo un problema al enviar el correo de verificación.",
      });
    }

    res.status(201).json({
      user: {
        id: newUser.id,
        firstname: newUser.nombre,
        lastname: newUser.apellidos,
        email: newUser.email,
        phone: newUser.telefono,
        birthdate: newUser.fecha_nacimiento,
        rol: newUser.rol,
      },
    });
  } catch (error) {
    res.status(400).json({
      message: "Hubo un problema al registrar el usuario, inténtalo de nuevo.",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, tokenCaptcha } = req.body;

  try {
    const { data: responseCaptcha } = await recaptchaAPI.post(
      "/siteverify",
      {},
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: tokenCaptcha,
        },
      }
    );

    if (!responseCaptcha.success) {
      return res.status(400).json({
        message: "Fallo en la verificación del reCAPTCHA, inténtalo de nuevo.",
      });
    }

    let userExists = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!userExists) {
      return res.status(404).json({
        message: `El correo electrónico ${email} no está registrado.`,
      });
    }

    let { id: user_id, ...userFound } = userExists;

    // Verify details about account like email verified or account blocked
    const accountStatus = await verifyAccountStatus(user_id);

    if (accountStatus.statusCode !== 200) {
      return res.status(accountStatus.statusCode).json({
        message: accountStatus.message,
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      userFound.contrasena
    );

    userFound = structuredClone(userFound);

    if (!isPasswordCorrect) {
      const attempts = await loginAttempts(user_id);

      return res.status(401).json({
        message: `El correo electrónico o contraseña no coinciden. Intentos restantes: ${
          5 - attempts
        }`,
      });
    }

    // Register login activity
    await prisma.usuariosRegistroActividad.create({
      data: {
        usuario: {
          connect: { id: user_id },
        },
        tipo_actividad: "INICIO_SESION",
        fecha: new Date(),
      },
    });

    delete userFound.password;

    const userDetails = await prisma.usuariosConfiguracionCuenta.findFirst({
      where: { usuario_id: user_id },
      select: {
        autenticacion_doble_factor: true
      }
    });

    const user = {
      id: user_id,
      nombre: userFound.nombre,
      apellidos: userFound.apellidos,
      fecha_nacimiento: userFound.fecha_nacimiento,
      telefono: userFound.telefono,
      email: userFound.email,
      rol: userFound.rol,
      hasMFA: userDetails.autenticacion_doble_factor
    };

    const token = jwt.sign(
      { user },
      JWT_SECRET,
      { expiresIn: 18000 } // 5h
    );

    return res.status(200).json({
      user,
      token,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      message: "El token es obligatorio.",
    });
  }

  try {
    // Verify token and destruct email
    const { email } = jwt.verify(token, JWT_SECRET);

    // Verify if user exists
    const { id: user_id } = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user_id) {
      return res.status(400).send(`Hubo un problema al encontrar el usuario.`);
    }

    const { id: userIdDetails, email_verificado } =
      await prisma.usuariosConfiguracionCuenta.findFirst({
        where: { usuario_id: user_id },
        select: { id: true, email_verificado: true },
      });

    if (email_verificado) {
      return res.status(400).json({
        message: "El usuario ya está verificado, ahora puedes iniciar sesión.",
        isEmailVerified: true,
      });
    }

    await prisma.usuariosConfiguracionCuenta.update({
      where: { id: userIdDetails },
      data: {
        email_verificado: true,
      },
    });

    return res.sendStatus(200);
  } catch (err) {
    if ((err.name = "JsonWebTokenError")) {
      return res.status(403).json({ errorMessage: "Token expirado" });
    }

    if ((err.name = "TokenExpiredError")) {
      return res.status(401).json({ errorMessage: "Token inválido" });
    }

    return res.status(400).send({
      errorMessage: "Hubo un problema, inténtalo de nuevo.",
    });
  }
};

export const mfaSetup = async (req, res) => {
  const { email } = req.body; // Obtener el token de la URL

  try {
    if (!email) {
      return res.status(400).json({
        message: "Falta el email",
      });
    }

    // Crear la URL otpauth para Google Authenticator o cualquier app TOTP
    const otpauthURL = authenticator.keyuri(email, "OlympusGymApp", MFA_SECRET);

    const qrCode = await QRCode.toDataURL(otpauthURL);

    // Enviar el secreto y el código QR como respuesta
    res.json({
      qrCode: qrCode,
    });
  } catch (err) {
    // Manejo de errores
    console.error("Error generando el código QR:", err);
    res.status(500).json({ message: "Error generando el código QR" });
  }
};

export const mfaVerify = async (req, res) => {
  const { token, secret } = req.body;

  const isValid = authenticator.verify({ token, secret });  

  if (isValid) {
    return res.json({
      message: "Código verificado correctamente, bienvenido!",
    });
  } else {
    return res.status(400).json({
      message:
        "Código de verificación incorrecto, verifica el código de nuevo.",
    });
  }
};

export const enableMFA = async (req, res) => {
  const { email, mfaState } = req.body;
  
  try {
    const userFound = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
      }
    });

    if(!userFound){
      return res.status(404).json({
        message: `El usuario con el ecorreo electrónico ${email} no fue encontrado.`
      });
    }

    await prisma.usuariosConfiguracionCuenta.updateMany({
      where: { usuario_id: userFound.id },
      data: {
        autenticacion_doble_factor: mfaState
      }
    })

    return res.sendStatus(200)
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      mesage: 'Hubo un problema al activar la autenticación de 2 pasos, inténtalo de nuevo.'
    });
  }
};

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Obtener el token de la cabecera Authorization

  if (!token) {
    return res.status(401).json({
      message: "No se proporcionó el token",
    });
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    const newToken = jwt.sign(
      { user: decoded.user },
      JWT_SECRET,
      { expiresIn: 18000 } // 5h
    );

    return res.status(200).json({
      user: decoded.user,
      token: newToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      message: "Token inválido o expirado",
      error: error.message,
    });
  }
};

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(404)
      .json({ message: "No se proporcionó el correo electrónico" });
  }

  try {
    // Verify user exits
    const userFound = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
      },
    });

    if (!userFound) {
      return res
        .status(404)
        .json({
          message:
            `El usuario con el correo electrónico ${email} no está registrado.`,
        });
    }

    const { email_verificado } =
      await prisma.usuariosConfiguracionCuenta.findFirst({
        where: { usuario_id: userFound.id },
        select: {
          email_verificado: true,
        },
      });

    if (email_verificado) {
      return res.status(400).json({
        message: "El usuario ya está verificado, ahora puedes iniciar sesión",
        isEmailVerified: true,
      });
    }

    const isEmailSent = await sendEmailByType(userFound.nombre, email, 'REENVIO_VERIFICACION_EMAIL');

    if (!isEmailSent) {
      return res
        .status(500)
        .json({
          message: "Hubo un problema al enviar el correo de verificación, inténtalo de nuevo",
        });
    }

    return res
      .status(200)
      .json({ message: "Correo de verificación reenviado correctamente." });
  } catch (error) {
    return res.status(500).json({ message: "Error al reenviar el correo" });

  }
};

export const changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  try {
    const userFound = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        contrasena: true,
      },
    });

    if (!userFound) {
      return res.status(404).json({
        message: `El usuario con el correo electrónico ${email} no fue encontrado.`,
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      userFound.contrasena
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "La contraseña actual es incorrecta, inténtalo de nuevo.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.usuario.update({
      where: { email },
      data: { contrasena: hashedNewPassword },
    });

    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).json({
      message: "Hubo un problema al hacer la solicitud, inténtalo de nuevo.",
    });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { newPassword } = req.body;

  if (!newPassword || !token) {
    return res.status(400).json({
      message: `Todos los campos son necesarios.`,
    });
  }

  try {
    // Verificar el token
    const { email } = jwt.verify(token, JWT_SECRET);

    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) return res.status(400).send("Usuario no encontrado.");

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.usuario.update({
      where: { email },
      data: { contrasena: hashedNewPassword },
    });

    return res.status(200).json({
      message: "La contraseña se actualizó correctamente.",
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError)
      return res.status(403).json({ message: "El token ha expirado" });
    if (error instanceof jwt.JsonWebTokenError)
      return res.status(403).json({ message: "El token es inválido" });
    if (error instanceof jwt.NotBeforeError)
      return res.status(403).json({ message: "El token aún no es válido" });

    res
      .status(500)
      .json({ message: "Algo salió mal, inténtalo de nuevo más tarde." });
  }
};

export const sendPasswordResetInstructions = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: `El campo email es obligatorio.`,
    });
  }

  try {
    const userFound = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
      },
    });

    if (!userFound) {
      return res.status(404).json({
        message: `El correo electrónico ${email} no está vinculado a ninguna cuenta.`,
      });
    }

    const isEmailSent = await sendEmailByType(userFound.nombre, email, 'RESTABLECER_CONTRASENA');

    if (!isEmailSent) {
      return res.status(500).json({
        message:
          "Hubo un problema al enviar el correo electrónico, intenta de nuevo.",
      });
    }

    return res.status(200).json({
      message:
        "Las instrucciones han sido enviadas a tu correo electrónico, por favor revisa tu bandeja de entrada.",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "Algo salió mal, inténtalo de nuevo más tarde.",
    });
  }
};

// Example
// export const nameFunction = async(req, res) => {}
