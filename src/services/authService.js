import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const checkAccountLock = async (email) => {
  const user = await prisma.usuario.findUnique({ where: { email } });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  if (user.isLocked) {
    const lockDuration = BigInt(15 * 60 * 1000); // 15 minutos en milisegundos como BigInt
    const currentTime = BigInt(Date.now()); // Convertir el timestamp actual a BigInt
    const lockTime = BigInt(user.lockTime); // Asegurarse de que lockTime también sea BigInt

    const timePassed = currentTime - lockTime;

    if (timePassed >= lockDuration) {
      // Si ya pasó el tiempo de bloqueo, desbloquear la cuenta
      await prisma.usuario.update({
        where: { email },
        data: {
          isLocked: false,
          failedLoginAttempts: 0,
          lockTime: null, // Restablecer lockTime a null
        },
      });

      return { isLocked: false };
    } else {
      // Si la cuenta sigue bloqueada, calcular el tiempo restante
      const timeRemaining = Math.floor(Number(lockDuration - timePassed) / 1000); // Convertir a Number para el cálculo
      return { isLocked: true, timeRemaining };
    }
  }

  return { isLocked: false };
};

export const updateLoginAttempts = async (email, reset = false) => {
  const user = await prisma.usuario.findUnique({ where: { email } });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const { failedLoginAttempts } = user;

  let attempts = reset ? 0 : failedLoginAttempts + 1;

  await prisma.usuario.update({
    where: { email },
    data: {
      failedLoginAttempts: attempts,
      lastAttempt: new Date(),
    },
  });

  if (attempts === 4) {
    await prisma.usuario.update({
      where: { email },
      data: {
        isLocked: true,
        lockTime: BigInt(Date.now()), // Asegurarse de guardar lockTime como BigInt
      },
    });
  }

  return attempts;
};
