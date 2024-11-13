import { isPasswordPwned } from "../utils/passwordHelper.js";

export const checkPassword = async (req, res) => {
  const { password } = req.body;
  
  try {    
    if (!password) {
      return res.status(400).json({ message: "La contraseña es obligatoria" });
    }

    // Usamos el helper para verificar si la contraseña ha sido comprometida
    const { ok, errorMessage } = await isPasswordPwned(password);

    if(errorMessage) throw new Error(errorMessage);

    return res.status(200).json({ ok });
  } catch (error) {
    console.error('Error al verificar la contraseña:', error);
    return res.status(500).json({ message: 'Error verificando la contraseña' });
  }
};
