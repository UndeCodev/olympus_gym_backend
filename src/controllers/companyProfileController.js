import { PrismaClient } from "@prisma/client";
import { uploadImage } from "../config/imagekit.js";

import fs from "fs-extra";

const prisma = new PrismaClient();

export const getCompanyProfile = async (req, res) => {
  try {
    const companyProfile = await prisma.companyProfile.findFirst();

    return res.status(200).json(companyProfile);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({
        error:
          "Hubo un problema al hacer obtener el perfil de la empresa, inténtalo de nuevo.",
      });
  }
};

export const updateCompanyProfile = async (req, res) => {
  const { id, pageTitle, slogan, email, phoneNumber, address, socialMedia } = req.body;

  if (!pageTitle || !slogan || !email || !phoneNumber || !address || !socialMedia) {
    return res.status(400).json({
      message: "Todos los campos son necesarios",
    });
  }

  try {
    if (req.files?.logoFile) {
      const { logoFile } = req.files;

      const { url, thumbnailUrl } = await uploadImage({
        folder: "company_profile",
        filePath: logoFile.tempFilePath,
        fileName: logoFile.name,
      });

      await prisma.companyProfile.update({
        where: { id: parseInt(id) },
        data: {
          logo_url: url,
          logo_min_url: thumbnailUrl,
          titulo_sitio: pageTitle,
          eslogan: slogan,
          // direccion: addre,
          email: email,
          numero_contacto: phoneNumber,
          // redes_sociales: JSON.parse(socialMedia),
        },
      });

      fs.unlink(logoFile.tempFilePath);

      return res.status(200).json({
        message: "Perfil de la compañía actualizado correctamente.",
        logo_updated: {
          logo_url: url,
          thumbnail_url: thumbnailUrl,
        },
      });
    }
    await prisma.companyProfile.update({
      where: { id: parseInt(id) },
      data: {
        titulo_sitio: pageTitle,
        eslogan: slogan,
        direccion: JSON.parse(address),
        email: email,
        numero_contacto: phoneNumber,
        redes_sociales: JSON.parse(socialMedia),
      },
    });
    return res.status(200).json({
      message: "Perfil de la compañía actualizado correctamente.",
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error al obtener las políticas de privacidad" });
  }
};
