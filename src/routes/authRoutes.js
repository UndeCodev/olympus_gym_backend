// routes/authRoutes.js
import { Router } from "express";
import { 
  loginUser, 
  registerUser, 
  verifyEmail, 
  mfaSetup, 
  mfaVerify, 
  verifyToken, 
  resendVerificationEmail, 
  changePassword,
  sendPasswordResetInstructions,
  resetPassword,
  enableMFA
} from "../controllers/authController.js";
import { checkPassword } from '../controllers/passwordController.js';

const router = Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/mfa/setup", mfaSetup);
router.put("/mfa/enable", enableMFA);
router.post("/mfa/verify", mfaVerify);

// * Helpers to * //

// reset passsword
router.put("/change-password", changePassword);

// verify an email
router.put("/verify-email", verifyEmail);

// resend a verification email
router.post("/resend-verification-email", resendVerificationEmail);

// send a email with instructions to reset password
router.post("/send-password-reset-instructions", sendPasswordResetInstructions);
router.put("/reset-password", resetPassword);

// verify a password
router.post("/check-pswd", checkPassword);

// verify a user
router.get("/verify-token", verifyToken);



export default router;
