import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getPrivacyPolicies = async (req, res) => {
  try {
    const privacyPolicies = await prisma.privacyPolicy.findMany({
      orderBy: { status: "desc" }
    });
    res.status(200).json(privacyPolicies);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al obtener las políticas de privacidad" });
  }
};

export const createPrivacyPolicy = async (req, res) => {
  const { title, content, effectiveDate } = req.body;

  if (!title || !content || !effectiveDate) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    // Hacer que cualquier versión anterior no sea la versión actual
    await prisma.privacyPolicy.updateMany({
      where: { status: "vigente" },
      data: { status: "no vigente" },
    });

    const lastPolicy = await prisma.privacyPolicy.findFirst({
      orderBy: { version: "desc" }, // Ordenar por la versión más alta
    });

    const newVersion = lastPolicy ? lastPolicy.version + 1.0 : 1.0; // Si existe, incrementar, si no iniciar en 1.0

    // Definir el estado según la fecha de vigencia
    const currentDate = new Date();

    const status = new Date(effectiveDate) > currentDate ? "vigente" : "no vigente";

    const newPrivacyPolicy = await prisma.privacyPolicy.create({
      data: {
        title,
        content,
        effectiveDate: new Date(effectiveDate),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: newVersion,
        status
      },
    });

    return res.status(201).json({
      message: "Política de privacidad creada exitosamente.",
      newPrivacyPolicy,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({
        message:
          "Error al crear la política de privacidad. Intenta de nuevo más tarde.",
      });
  }
};

export const updatePrivacyPolicy = async (req, res) => {
  const { id } = req.params;
  const { title, content, effectiveDate, isCurrent } = req.body;

  if (!title || !content || !effectiveDate || !id) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    if(isCurrent){
      await prisma.privacyPolicy.updateMany({
        where: { status: "vigente" },
        data: { status: "no vigente" },
      });
    }
    
    // Obtener la política actual
    const currentPolicy = await prisma.privacyPolicy.findUnique({
      where: { id: parseInt(id) },
    });

    if (!currentPolicy) {
      return res
        .status(404)
        .json({ message: "Política de privacidad no encontrada" });
    }

    const updatedPrivacyPolicy = await prisma.privacyPolicy.create({
      data: {
        title,
        content,
        effectiveDate: new Date(effectiveDate),
        updatedAt: new Date(),
        status: isCurrent ? 'vigente' : 'no vigente'
      },
    });

    res
      .status(200)
      .json({
        message: "Política de privacidad actualizada exitosamente.",
        data: updatedPrivacyPolicy,
      });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error al actualizar la política de privacidad." });
  }
};

export const deletePrivacyPolicy = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPolicy = await prisma.privacyPolicy.update({
      where: { id: parseInt(id) },
      data: { status: "eliminada" },
    });

    res.status(200).json({
      message: "Política de privacidad marcada como eliminada.",
      data: deletedPolicy,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la política de privacidad." });
  }
};