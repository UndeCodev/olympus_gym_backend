// routes/authRoutes.js
import { Router } from "express";
import { loginUser, registerUser, verifyEmail, mfaSetup, mfaVerify } from "../controllers/authController.js";
import { checkPassword } from '../controllers/passwordController.js';

const router = Router();

// Test route
router.get("/test", (req, res) => {
  res.status(200).json({ message: "La API está funcionando correctamente" });
});

router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/verify-email", verifyEmail);
router.get("/mfa/setup", mfaSetup);
router.post("/mfa/verify", mfaVerify);
router.post("/check-pswd", checkPassword);

export default router;
