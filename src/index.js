// app.js
import express from "express";
import morgan from "morgan"; 
import cors from "cors";
import authRoutes from "./routes/authRoutes.js"; 
import documentRoutes from "./routes/documentRoutes.js"; 
import companyProfileRoutes from "./routes/companyProfileRoutes.js"; 
import adminRoutes from "./routes/adminRoutes.js"; 

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Usar las rutas de autenticación
app.get("/", (req, res) => res.send("Express on Vercel"));
app.use("/auth", authRoutes);
app.use("/dr", documentRoutes);
app.use("/settings", companyProfileRoutes);
app.use("/admin", adminRoutes);


const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app