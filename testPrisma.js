import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAllUsers() {
  try {
    // Conectar a la base de datos
    await prisma.$connect();

    // Obtener todos los registros de la tabla usuarios
    const emailExists = await prisma.usuario.findUnique({
      where: {
        email: 'undecode0@hotmail.com',
      },
    });
    
    console.log(emailExists);
    
  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAllUsers();
