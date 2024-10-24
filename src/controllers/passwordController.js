import { isPasswordPwned } from "../utils/passwordHelper.js";

export const checkPassword = async (req, res) => {
  const { password } = req.body;
  
  try {    
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Usamos el helper para verificar si la contraseña ha sido comprometida
    const result = await isPasswordPwned(password);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error al verificar la contraseña:', error);
    return res.status(500).json({ message: 'Error verificando la contraseña' });
  }
};
