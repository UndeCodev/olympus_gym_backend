import crypto from 'crypto';
import axios from "axios";

// Generate hash SHA-1
export const sha1 = (password) => crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

// Verify if password is compromised  
export const isPasswordPwned = async (password) => {
  const sha1Hash = sha1(password);
  const prefix = sha1Hash.slice(0, 5);
  const suffix = sha1Hash.slice(5);

  try {
    const { data } = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`
    );

    const hashes = data.split("\n");

    const isPasswordCompromised = hashes.some((hashLine) => hashLine.startsWith(suffix + ':'));

    return {
      ok: !isPasswordCompromised
    }
  } catch (error) {
    console.error("Error al verificar la contraseña:", error.data);
    return {
      errorMessage: error 
    };
  }
};

