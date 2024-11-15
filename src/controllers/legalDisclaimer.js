import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getLegalDisclaimer = async (req, res) => {
  try {
    const legalDisclaimer = await prisma.legalDisclaimer.findMany({
      orderBy: { estado: "asc" }
    });
    return res.status(200).json(legalDisclaimer);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener el descargo legal" });
  }
};

export const getLegalDisclaimerEnable = async (req, res) => {
  try {
    const privacyPolicy = await prisma.legalDisclaimer.findFirst({
      where: { estado: "VIGENTE" }
    });
    return res.status(200).json(privacyPolicy);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener las políticas de privacidad" });
  }
};

export const createLegalDisclaimer = async (req, res) => {
  const { title, content, effectiveDate } = req.body;

  if (!title || !content || !effectiveDate) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    // Hacer que cualquier versión anterior no sea la versión actual
    await prisma.legalDisclaimer.updateMany({
      where: { estado: "VIGENTE" },
      data: { estado: "NO_VIGENTE" },
    });

    const lastDisclaimer = await prisma.legalDisclaimer.findFirst({
      orderBy: { version: "desc" }, // Ordenar por la versión más alta
    });

    const newVersion = lastDisclaimer ? parseInt(lastDisclaimer.version) + 1.0 : 1.0; // Si existe, incrementar, si no iniciar en 1.0

    // Definir el estado según la fecha de vigencia
    const currentDate = new Date();
    const status = new Date(effectiveDate) > currentDate;

    const newLegalDisclaimer = await prisma.legalDisclaimer.create({
      data: {
        titulo: title,
        contenido: content,
        fecha_vigencia: new Date(effectiveDate),
        version: newVersion,
        estado: status ? "VIGENTE" : "NO_VIGENTE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      message: "Descargo legal creado exitosamente.",
      newLegalDisclaimer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al crear el descargo legal. Intenta de nuevo más tarde.",
    });
  }
};

export const updateLegalDisclaimer = async (req, res) => {
  const { id } = req.params;
  const { title, content, effectiveDate, isCurrent } = req.body;

  if (!title || !content || !effectiveDate || !id) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    if (isCurrent) {
      await prisma.legalDisclaimer.updateMany({
        where: { estado: "VIGENTE" },
        data: { estado: "NO_VIGENTE" },
      });
    }

    // Obtener el descargo legal actual
    const currentDisclaimer = await prisma.legalDisclaimer.findUnique({
      where: { id: parseInt(id) },
    });

    if (!currentDisclaimer) {
      return res.status(404).json({ message: "Deslinde legal no encontrado" });
    }

    // Lógica para incrementar la versión
    let newVersion;
    if (Math.floor(currentDisclaimer.version) === currentDisclaimer.version) {
      // Si la versión es un número entero (por ejemplo, "3"), añadir ".1"
      newVersion = currentDisclaimer.version + 0.1;
    } else {
      // Si ya tiene una parte decimal (por ejemplo, "3.1"), incrementar el decimal
      const [whole, decimal] = currentDisclaimer.version.toString().split('.');
      newVersion = `${whole}.${parseInt(decimal) + 1}`;
    }

    const updatedLegalDisclaimer = await prisma.legalDisclaimer.create({
      data: {
        titulo: title,
        contenido: content,
        fecha_vigencia: new Date(effectiveDate),
        estado: isCurrent ? "VIGENTE" : "NO_VIGENTE",
        version: parseFloat(newVersion),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "Deslinde legal actualizado exitosamente.",
      data: updatedLegalDisclaimer,
    });
  } catch (error) {
    console.log(error);
    return nres.status(500).json({ message: "Error al actualizar el descargo legal." });
  }
};

export const deleteLegalDisclaimer = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedDisclaimer = await prisma.legalDisclaimer.update({
      where: { id: parseInt(id) },
      data: { estado: "ELIMINADA" },
    });

    return res.status(200).json({
      message: "Deslinde legal marcado como eliminado.",
      data: deletedDisclaimer,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar el descargo legal." });
  }
};
