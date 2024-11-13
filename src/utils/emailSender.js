import transporter from "../config/nodemailer.js";
import { EMAIL_USER } from "./config.js";

export const sendEmail = async(to, subject, htmlContent) => {
  const mailOptions = {
    from: `"Olympus GYM" <${EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error al enviar el correo: ', error);
    return false;
  }
}
