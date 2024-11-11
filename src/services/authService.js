import { PrismaClient } from "@prisma/client";
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
