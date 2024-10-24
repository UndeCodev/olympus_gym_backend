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
      .json({ error: "Error al obtener las políticas de privacidad" });
  }
};


export const updateCompanyProfile = async (req, res) => {
  const { id, pageTitle, slogan, email, phoneNumber, address, socialMedia } = req.body;

  if(!pageTitle || !slogan || !email || !phoneNumber || !address || !socialMedia){
    return res.status(400).json({
      message: 'Todos los campos son necesarios'
    });
  }

  const { address: addressUpdated, city, state, postalCode } = JSON.parse(address);
  
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
          thumbnail_logo_url: thumbnailUrl,
          page_title: pageTitle,
          slogan: slogan,
          address: addressUpdated,
          city: city,
          state: state,
          postal_code: postalCode,
          email: email,
          phone_number: phoneNumber,
          social: JSON.parse(socialMedia)
        }
      });

      fs.unlink(logoFile.tempFilePath);

      return res.status(200).json({
        message: 'Perfil de la compañía actualizado correctamente.',
        logo_updated: {
          logo_url: url,
          thumbnail_url: thumbnailUrl
        }
      });
    }

    await prisma.companyProfile.update({
      where: { id: parseInt(id) },
      data: { 
        page_title: pageTitle,
        slogan: slogan,
        address: addressUpdated,
        city: city,
        state: state,
        postal_code: postalCode,
        email: email,
        phone_number: phoneNumber,
        social: JSON.parse(socialMedia)
      }
    });

    return res.status(200).json({
      message: 'Perfil de la compañía actualizado correctamente.',
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "Error al obtener las políticas de privacidad" });
  }
};
