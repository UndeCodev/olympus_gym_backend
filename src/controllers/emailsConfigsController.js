import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getEmailConfigurationByTypeEmail = async (req, res) => {
  const { typeEmail } = req.body;
  
  if(!typeEmail){
    return res.status(400).json({
      message: 'El campo typeEmail es obligatorio'
    });
  }

  try {
    const emailConfig = await prisma.emailConfigurations.findFirst({
      where: { tipo_email: typeEmail }
    })

    return res.status(200).json({
      emailConfig
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener las políticas de privacidad" });
  }
};

export const updateEmailConfigurationByTypeEmail = async (req, res) => {
  const { typeEmail, subject, greeting, message, buttonText, expirationTime } = req.body;
  
  if(!typeEmail || !subject || !greeting || !message || !buttonText || !expirationTime){
    return res.status(400).json({
      message: 'Todos los campos son obligatorios'
    });
  }

  try {
    await prisma.emailConfigurations.updateMany({
      where: { tipo_email: typeEmail },
      data: {
        asunto: subject,
        saludo: greeting,
        mensaje: message,
        texto_boton: buttonText,
        tiempo_expiracion: expirationTime
      }
    })

    return res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Hubo un problema al actualizar la configuración del correo." });
  }
};