import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getTermsAndConditions = async (req, res) => {
  try {
    const termsAndConditions = await prisma.termsAndConditions.findMany({
      orderBy: { estado: "asc" }
    });
    res.status(200).json(termsAndConditions);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los términos y condiciones" });
  }
};

export const getTermsEnable = async (req, res) => {
  try {
    const termsAndConditions = await prisma.termsAndConditions.findFirst({
      where: { estado: "VIGENTE" },
      select: {
        titulo: true,
        contenido: true,
        fecha_vigencia: true,
        updatedAt: true
      }
    });
    res.status(200).json(termsAndConditions);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error al obtener las políticas de privacidad" });
  }
};


export const createTermsAndConditions = async (req, res) => {
  const { title, content, effectiveDate } = req.body;

  if (!title || !content || !effectiveDate) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    // Hacer que cualquier versión anterior no sea la versión actual
    await prisma.termsAndConditions.updateMany({
      where: { estado: "VIGENTE" },
      data: { estado: "NO_VIGENTE" },
    });

    const lastTerms = await prisma.termsAndConditions.findFirst({
      orderBy: { version: "desc" }, // Ordenar por la versión más alta
    });

    const newVersion = lastTerms ? parseInt(lastTerms.version) + 1.0 : 1.0; // Si existe, incrementar, si no iniciar en 1.0

    // Definir el estado según la fecha de vigencia
    const currentDate = new Date();
    const status = new Date(effectiveDate) > currentDate;

    const newTermsAndConditions = await prisma.termsAndConditions.create({
      data: {
        titulo: title,
        contenido: content,
        fecha_vigencia: new Date(effectiveDate),
        version: newVersion,
        estado: status ? 'VIGENTE' : 'NO_VIGENTE',
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    });

    return res.status(201).json({
      message: "Términos y condiciones creados exitosamente.",
      newTermsAndConditions,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Hubo un problema al crear los términos y condiciones. Intenta de nuevo más tarde.",
    });
  }
};

export const updateTermsAndConditions = async (req, res) => {
  const { id } = req.params;
  const { title, content, effectiveDate, isCurrent } = req.body;

  if (!title || !content || !effectiveDate || !id) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    if(isCurrent){
      await prisma.termsAndConditions.updateMany({
        where: { estado: "VIGENTE" },
        data: { estado: "NO_VIGENTE" },
      });
    }
    
    // Obtener los términos y condiciones actuales
    const currentTerms = await prisma.termsAndConditions.findUnique({
      where: { id: parseInt(id) },
    });

    if (!currentTerms) {
      return res.status(404).json({ message: "Términos y condiciones no encontrados" });
    }

    // Lógica para incrementar la versión
    let newVersion;
    if (Math.floor(currentTerms.version) === currentTerms.version) {
      // Si la versión es un número entero (por ejemplo, "3"), añadir ".1"
      newVersion = currentTerms.version + 0.1;
    } else {
      // Si ya tiene una parte decimal (por ejemplo, "3.1"), incrementar el decimal
      const [whole, decimal] = currentTerms.version.toString().split('.');
      newVersion = `${whole}.${parseInt(decimal) + 1}`;
    }

    const updatedTermsAndConditions = await prisma.termsAndConditions.create({
      data: {
        titulo: title,
        contenido: content,
        version: parseFloat(newVersion),
        estado: isCurrent ? "VIGENTE" : "NO_VIGENTE",
        fecha_vigencia: new Date(effectiveDate),
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      message: "Términos y condiciones actualizados exitosamente.",
      data: updatedTermsAndConditions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error al actualizar los términos y condiciones." });
  }
};

export const deleteTermsAndConditions = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTerms = await prisma.termsAndConditions.update({
      where: { id: parseInt(id) },
      data: { estado: "ELIMINADA" },
    });

    res.status(200).json({
      message: "Términos y condiciones marcados como eliminados.",
      data: deletedTerms,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar los términos y condiciones." });
  }
};
