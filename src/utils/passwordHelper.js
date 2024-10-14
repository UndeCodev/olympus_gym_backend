import crypto from 'crypto';
import axios from "axios";

// Generar el hash SHA-1
export const sha1 = (password) => crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

// Verificar si la contraseña ha sido comprometida
export const isPasswordPwned = async (password) => {
  const sha1Hash = sha1(password);
  const prefix = sha1Hash.slice(0, 5);
  const suffix = sha1Hash.slice(5);

  try {
    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`
    );
    const hashes = response.data.split("\n");

    // const found = hashes.some((hashLine) => {
    //   const [hashSuffix] = hashLine.split(":");
    //   return hashSuffix === suffix;
    // });
    // console.timeEnd("Optimized Code startsWith");

    // console.time("Optimized Code startsWith");
    const found = hashes.some((hashLine) => hashLine.startsWith(suffix + ':'));
    // console.timeEnd("Optimized Code startsWith");

    const result = found ? 'Comprometida' : 'Segura';

    return result;
  } catch (error) {
    console.error("Error al verificar la contraseña:", error.response.data);
    return false;
  }
};

