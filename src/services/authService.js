import Usuario from "../models/usuario.js";

export const checkAccountLock = async (email) => {
  const user = await Usuario.findOne({ where: { email } });

  if (user.dataValues.isLocked) {
    const lockDuration = 3 * 60 * 1000; // 30 segundos en milisegundos
    const currentTime = Date.now(); // Timestamp actual
    const lockTime = user.dataValues.lockTime; // Timestamp almacenado cuando la cuenta fue bloqueada

    const timePassed = currentTime - lockTime;

    if (timePassed >= lockDuration) {
      // Si ya pasó el tiempo de bloqueo, desbloquear la cuenta
      await user.update({ isLocked: false, failedLoginAttempts: 0, lockTime: 0 });
      return { isLocked: false };
    } else {
      // Si la cuenta sigue bloqueada, calcular el tiempo restante
      const timeRemaining = Math.floor((lockDuration - timePassed) / 1000) ;
      return { isLocked: true, timeRemaining };
    }
  }
};

export const updateLoginAttempts = async (email, reset = false) => {
  const user = await Usuario.findOne({ where: { email } });

  const { failedLoginAttempts } = user.dataValues;
  
  let attempts = reset ? 0 : failedLoginAttempts + 1;

  await user.update({
    failedLoginAttempts: attempts,
    lastAttempt: Date.now(),
  });

  if (attempts === 4) {
    await user.update({
      isLocked: true,
      lockTime: Date.now()
    });
  }

  return attempts;
};
