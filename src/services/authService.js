import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { BASE_URL, JWT_SECRET } from "../utils/config.js";
import { sendEmail } from "../utils/emailSender.js";

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

export const sendEmailByType = async(username, email, typeEmail) => {  
  const routesAllowed = {
    RESTABLECER_CONTRASENA: 'restablecer-contrasena',
    REGISTRO_USUARIO: 'verificar-email',
    REENVIO_VERIFICACION_EMAIL: 'verificar-email' 
  }

  const emailConfig = await prisma.emailConfigurations.findFirst({
    where: { tipo_email: typeEmail }  
  });

  const { tiempo_expiracion } = emailConfig

  // Create a token signed with time to expire
  const timeToExpireInSeconds = tiempo_expiracion * 60;
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: timeToExpireInSeconds }); // 15 min default
  
  // Time format to show
  const timeToExpireMinutesOrHours = tiempo_expiracion >= 60 ? tiempo_expiracion / 60 : tiempo_expiracion;
  const formatTimeToExpire = tiempo_expiracion >= 60 ? `horas` : 'minutos'; 

  const routeByTypeEmail = routesAllowed[emailConfig.tipo_email] || routesAllowed.REGISTRO_USUARIO;  
  const verificationLink = `${BASE_URL}/auth/${routeByTypeEmail}/?token=${token}`;

  // Email content
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
      <h2 style="color: #333;">${emailConfig.saludo || '¡Hola!'} ${username || ''}</h2>
      <p style="color: #333; font-size: 16px;">
          ${emailConfig.mensaje || 'Gracias por registrarte. Por favor, verifica tu correo electrónico haciendo clic en el enlace de abajo.'}
      </p>
      <p style="text-align: center;">
          <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            ${emailConfig.texto_boton || 'Verificar correo'}
          </a>
      </p>
      <p style="color: #333; font-size: 16px;">
          Tienes ${timeToExpireMinutesOrHours} ${formatTimeToExpire} para completar la verificación antes de que tu token expire.
      </p>
      <p style="color: #555; font-size: 14px; text-align: center;">
          © 2024 Olympus GYM. Todos los derechos reservados.
      </p>
    </div>
  `;

  const subject = emailConfig.asunto;
  
  const isEmailSent = await sendEmail(
    email,
    subject,
    htmlContent
  );

  return isEmailSent;
}