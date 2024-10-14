// app.js
import express from "express";
import morgan from "morgan"; // Importamos morgan
import cors from "cors";
import authRoutes from "./routes/authRoutes.js"; // Importar las rutas de autenticación

const app = express();

app.use(cors());

app.use(express.json());
app.use(morgan("dev"));

// Usar las rutas de autenticación
app.use("/auth", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
