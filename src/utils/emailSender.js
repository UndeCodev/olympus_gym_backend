import transporter from "../config/nodemailer.js";
import { EMAIL_USER } from "./config.js";

export const sendVerificationEmail = async(to, subject, htmlContent) => {
  const mailOptions = {
    from: `"Olympus GYM 💪🏽" <${EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo: ', error);
    return false;
  }
}
