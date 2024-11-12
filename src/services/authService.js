import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { BASE_URL, JWT_SECRET } from "../utils/config.js";
import { sendVerificationEmail } from "../utils/emailSender.js";

const prisma = new PrismaClient();

export const checkAccountStatus = async (userId) => {
  const userDetails = await prisma.usuariosConfiguracionCuenta.findFirst({
    where: { usuario_id: userId },
  });

  if (!userDetails)
    throw new Error(`El usuario con el ID ${userId} no fue encontrado`);

  if (!userDetails.cuenta_bloqueada) return { isAccountLocked: false };

  const lockDuration = BigInt(15 * 60 * 1000); // 15 min.
  const currentTime = BigInt(Date.now());
  const lockTime = BigInt(userDetails.tiempo_bloqueo);

  const timePassed = currentTime - lockTime;

  if (lockDuration >= timePassed) {
    const timeRemainingMs = Number(lockDuration - timePassed); // Milliseconds
    const timeRemainingMinutes = Math.floor(timeRemainingMs / (1000 * 60)); // Minutes
    const timeRemainingSeconds = Math.floor(
      (timeRemainingMs % (1000 * 60)) / 1000
    ); // Seconds

    return {
      isAccountLocked: true,
      timeRemainingMinutes,
      timeRemainingSeconds,
    };
  }

  await prisma.usuariosConfiguracionCuenta.update({
    where: { id: userDetails.id },
    data: {
      cuenta_bloqueada: false,
      intentos_fallidos_inicio_sesion: 0,
      tiempo_bloqueo: null,
    },
  });

  return { isAccountLocked: false };
};

export const loginAttempts = async (userId, reset = false) => {
  const userDetails = await prisma.usuariosConfiguracionCuenta.findFirst({
    where: { usuario_id: userId },
  });

  if (!userDetails)
    throw new Error(`El usuario con el ID ${userId} no fue encontrado`);

  let { intentos_fallidos_inicio_sesion } = userDetails;

  let attempts = reset ? 0 : ++intentos_fallidos_inicio_sesion;

  await prisma.usuariosConfiguracionCuenta.update({
    where: { id: userDetails.id },
    data: {
      intentos_fallidos_inicio_sesion: attempts,
      ultimo_intento_acceso: new Date(),
    },
  });


  // Block account temp
  if (attempts === 4) {
    await prisma.usuariosConfiguracionCuenta.update({
      where: { id: userDetails.id },
      data: {
        cuenta_bloqueada: true,
        tiempo_bloqueo: BigInt(Date.now()),
      },
    });

    // Register block account acitvity
    await prisma.usuariosRegistroActividad.create({
      data: {
        usuario: {
          connect: { id: userId }
        },
        tipo_actividad: "CUENTA_BLOQUEADA",
        fecha: new Date()
      },
    });
  }

  return attempts;
};

export const verifyAccountStatus = async (userId) => {
  try {
    const userDetails = await prisma.usuariosConfiguracionCuenta.findFirst({
      where: { usuario_id: userId },
    });

    if (!userDetails) {
      return {
        statusCode: 400,
        message: `El usuario con el ID ${userId} no fue encontrado`,
      };
    }

    if (!userDetails.email_verificado) {
      return {
        statusCode: 403,
        message:
          "Necesitas verificar tu correo electrónico antes de iniciar sesión, por favor revisa tu bandeja de entrada.",
      };
    }

    const { isAccountLocked, timeRemainingMinutes, timeRemainingSeconds } =
      await checkAccountStatus(userId);

    if (isAccountLocked) {
      return {
        statusCode: 403,
        message: `Cuenta bloqueada temporalmente, durante ${timeRemainingMinutes} minutos y ${timeRemainingSeconds} segundos.`,
      };
    }

    return {
      statusCode: 200,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: error.message,
    };
  }
};


export const sendEmailByType = async(email, subject, {
  greeting,
  username,
  message,
  btnText,
  expirationTime,
}) => {
  // Create token with 15 min. to expiry
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: 900 }); // 15 min to expire
  
  const verificationLink = `${BASE_URL}/auth/verificar-email/?token=${token}&email=${email}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
      <h2 style="color: #333;">${greeting || '¡Hola!'} ${username || ''}</h2>
      <p style="color: #333; font-size: 16px;">
          ${message || 'Gracias por registrarte. Por favor, verifica tu correo electrónico haciendo clic en el enlace de abajo.'}
      </p>
      <p style="text-align: center;">
          <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            ${btnText || 'Verificar correo'}
          </a>
      </p>
      <p style="color: #333; font-size: 16px;">
          Tienes ${expirationTime} para completar la verificación antes de que tu token expire.
      </p>
      <p style="color: #555; font-size: 14px; text-align: center;">
          © 2024 Olympus GYM. Todos los derechos reservados.
      </p>
    </div>
  `;
  
  const isEmailSend = await sendVerificationEmail(
    email,
    subject,
    htmlContent
  );


  return isEmailSend
}