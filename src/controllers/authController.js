import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { PrismaClient } from "@prisma/client";

import recaptchaAPI from "../api/recaptchaAPI.js";
import bcrypt from "bcrypt";

import {
  BASE_URL,
  JWT_SECRET,
  MFA_SECRET,
  RECAPTCHA_SECRET_KEY,
} from "../utils/config.js";

const prisma = new PrismaClient();

import {
  checkAccountLock,
  updateLoginAttempts,
} from "../services/authService.js";

import { sendVerificationEmail } from "../utils/emailSender.js";

export const registerUser = async (req, res) => {
  const { name, lastname, email, phone, password } = req.body;

  if (!name || !lastname || !email || !phone || !password) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    const emailExists = await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (emailExists) {
      return res.status(400).json({
        message: "El correo electrónico ya está registrado, intenta con otro.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      nombre: name,
      apellidos: lastname,
      email: email,
      telefono: phone,
      password: hashedPassword,
    };
    const newUser = await prisma.usuario.create({
      data: userData,
    });

    // Implementar JWT
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: 900 });

    // Enviar correo de verificación
    const verificationLink = `${BASE_URL}/auth/verificar-email/?token=${token}&email=${email}`;

    const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
    <h2 style="color: #333;">¡Hola ${userData.nombre || "Usuario"}!</h2>
    <p style="color: #333; font-size: 16px;">
      Gracias por registrarte en <strong>Olympus GYM</strong>. Por favor, verifica tu correo electrónico haciendo clic en el enlace de abajo.
    </p>
    <p style="text-align: center;">
      <a href="${verificationLink}" 
         style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
         Verificar correo
      </a>
    </p>
    <p style="color: #333; font-size: 16px;">
      Tienes 15 minutos para completar la verificación antes de que tu token expire.
    </p>
    <p style="color: #333; font-size: 16px;">
      Si no solicitaste esta verificación, simplemente ignora este mensaje.
    </p>
    <p style="color: #555; font-size: 14px; text-align: center;">
      © 2024 Olympus GYM. Todos los derechos reservados.
    </p>
  </div>
`;

    const isEmailSent = await sendVerificationEmail(
      email,
      "Verifica tu correo electrónico",
      htmlContent
    );

    if (!isEmailSent) {
      return res
        .status(500)
        .json({ message: "Error al enviar el correo de verificación" });
    }

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.nombre,
        email: newUser.email,
        phone: newUser.telefono,
        rol: newUser.rol,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error al registrar el usuario",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, tokenCaptcha } = req.body;

  if (!email || !password || !tokenCaptcha) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    const responseCaptcha = await recaptchaAPI.post(
      "/siteverify",
      {},
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: tokenCaptcha,
        },
      }
    );

    const isValidCaptcha = responseCaptcha.data.success;

    if (!isValidCaptcha) {
      return res.status(400).json({
        message: "Fallo en la verificación del reCAPTCHA, inténtalo de nuevo.",
      });
    }

    let userFound = await prisma.usuario.findUnique({ where: { email } });

    if (!userFound) {
      return res.status(404).json({
        message: `El correo electrónico ${email} no existe.`,
      });
    }

    if (!userFound.isEmailVerified) {
      return res.status(403).json({
        message: "Necesitas verificar tu correo antes de iniciar sesión.",
      });
    }

    // Verificar si la cuenta está bloqueada en la base de datos
    const isLocked = await checkAccountLock(email);

    if (isLocked && isLocked?.timeRemaining > 0) {
      // **Registrar actividad de bloqueo de cuenta en la base de datos**
      await prisma.user_activity_log.create({
        data: {
          user_id: userFound.id,
          activity_type: "Bloqueado",
        },
      });

      return res.status(403).json({
        message: "Cuenta bloqueada temporalmente.",
        timeRemaining: isLocked.timeRemaining, // Enviar el tiempo restante en segundos
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      userFound.password
    );

    userFound = structuredClone(userFound);

    if (!isPasswordCorrect) {
      const attempts = await updateLoginAttempts(email);

      return res.status(401).json({
        message: `El correo electrónico o contraseña no coinciden. Intentos restantes: ${
          5 - attempts
        }`,
      });
    }

    await updateLoginAttempts(email, true);

    delete userFound.password;

    const user = {
      id: userFound.id,
      nombre: userFound.nombre,
      apellidos: userFound.apellidos,
      telefono: userFound.telefono,
      email: userFound.email,
      rol: userFound.rol,
      hasMFA: userFound.hasMFA,
    };

    const token = jwt.sign(
      { user },
      JWT_SECRET,
      { expiresIn: 18000 } // 5h`
    );

    // **Registrar actividad de inicio de sesión en la base de datos**
    await prisma.user_activity_log.create({
      data: {
        user_id: userFound.id, 
        activity_type: "Inicio de sesión", 
      },
    });

    return res.status(200).json({
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      message: 'No se proporcionó ningún token'
    })
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.usuario.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(400).send("Usuario no encontrado.");
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: "El usuario ya está verificado, ya puedes iniciar sesión", 
        isEmailVerified: true
      });
    }

    await prisma.usuario.update({
      where: { email: decoded.email },
      data: {
        isEmailVerified: true,
      },
    });

    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      message: "Token inválido o expirado."
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
      secret: MFA_SECRET,
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
  const { userId, mfaState } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    // Actualiza el campo hasMFAEnable en la tabla usuarios
    await prisma.usuario.update({
      where: { id: userId }, // Asume que "id" es el campo primario en la tabla usuarios
      data: { hasMFA: mfaState },
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error activando MFA:", error);
    return res.status(500).json({ message: "Error al activar MFA" });
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
    return res.status(404).json({ message: "No se proporcionó el correo electrónico" });
  }
  
  try {
    // Verifica si el usuario existe y si ya está verificado
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: "El usuario ya está verificado, ya puedes iniciar sesión", 
        isEmailVerified: true
      });
    }

    // Implementar JWT
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: 900 });

    // Enviar correo de verificación
    const verificationLink = `${BASE_URL}/auth/verificar-email/?token=${token}&email=${email}`;
    const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
    <h2 style="color: #333;">¡Hola ${user.nombre || "Usuario"}!</h2>
    <p style="color: #333; font-size: 16px;">
      Gracias por registrarte en <strong>Olympus GYM</strong>. Por favor, verifica tu correo electrónico haciendo clic en el enlace de abajo.
    </p>
    <p style="text-align: center;">
      <a href="${verificationLink}" 
         style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
         Verificar correo
      </a>
    </p>
    <p style="color: #333; font-size: 16px;">
      Tienes 15 minutos para completar la verificación antes de que tu token expire.
    </p>
    <p style="color: #333; font-size: 16px;">
      Si no solicitaste esta verificación, simplemente ignora este mensaje.
    </p>
    <p style="color: #555; font-size: 14px; text-align: center;">
      © 2024 Olympus GYM. Todos los derechos reservados.
    </p>
  </div>
`;

    const isEmailSent = await sendVerificationEmail(
      email,
      "Verifica tu correo electrónico",
      htmlContent
    );

    if (!isEmailSent) {
      return res
        .status(500)
        .json({ message: "Error al enviar el correo de verificación" });
    }

    return res
      .status(200)
      .json({ message: "Correo de verificación reenviado" });
  } catch (error) {
    console.error("Error al reenviar el correo de verificación: ", error);
    return res.status(500).json({ message: "Error al reenviar el correo" });
  }
};

export const changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword || !email) {
      return res.status(400).json({
        message: `Todos los campos son necesarios.`,
      });
    }

    const userFound = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
      },
    });

    if (!userFound) {
      return res.status(404).json({
        message: `El usuario con el correo ${email} no fue encontrado.`,
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      userFound.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Contraseña incorrecta, inténtalo de nuevo.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.usuario.update({
      where: { email },
      data: { password: hashedNewPassword },
    });

    return res.status(200).json({
      message: "La contraseña se actualizó correctamente.",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "Algo salió mal",
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
      data: { password: hashedNewPassword },
    });

    return res.status(200).json({
      message: "La contraseña se actualizó correctamente.",
    });
  } catch (error) {
    console.log(error);
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

  try {
    if (!email) {
      return res.status(400).json({
        message: `Todos los campos son necesarios.`,
      });
    }

    const userFound = await prisma.usuario.findUnique({ where: { email } });

    if (!userFound) {
      return res.status(404).json({
        message: `El correo electrónico ${email} no está vinculado a ninguna cuenta.`,
      });
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: 900 });

    // Enviar correo de verificación
    const verificationLink = `${BASE_URL}/auth/restablecer-contrasena?token=${token}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
        <h2 style="color: #333;">¡Hola ${userFound.nombre || "Usuario"}!</h2>
        <p style="color: #333; font-size: 16px;">
          Recibimos una solicitud para restablecer tu contraseña de <strong>Olympus GYM</strong>. Haz clic en el enlace de abajo para establecer una nueva contraseña.
        </p>
        <p style="text-align: center;">
          <a href="${verificationLink}" 
             style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
             Restablecer contraseña
          </a>
        </p>
        <p style="color: #333; font-size: 16px;">
          Este enlace será válido durante los próximos 15 minutos. Si no restableces tu contraseña dentro de este tiempo, tendrás que solicitar un nuevo enlace.
        </p>
        <p style="color: #333; font-size: 16px;">
          Si no solicitaste un restablecimiento de contraseña, ignora este correo.
        </p>
        <p style="color: #555; font-size: 14px; text-align: center;">
          © 2024 Olympus GYM. Todos los derechos reservados.
        </p>
      </div>
    `;

    const isEmailSent = await sendVerificationEmail(
      email,
      "Instrucciones para restablecer tu contraseña en Olympus GYM",
      htmlContent
    );

    if (!isEmailSent) {
      return res.status(500).json({
        message:
          "Error al enviar el correo electrónico, intenta de nuevo más tarde.",
      });
    }

    return res.status(200).json({
      message:
        "Las instrucciones han sido enviadas a tu correo electrónico, por favor revisa tu bandeja de entrada.",
      link: verificationLink,
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
