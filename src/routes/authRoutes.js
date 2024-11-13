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

import { validateRequest } from '../middlewares/validateRequest.js';
import { userChangePassword, userLoginValidation, userRegistrationValidation } from "../validations/userValidation.js";

const router = Router();

// Completed

router.post("/login", userLoginValidation, validateRequest, loginUser);
router.post("/register", userRegistrationValidation, validateRequest, registerUser);

router.put("/change-password", userChangePassword, validateRequest, changePassword);
router.post("/check-pswd", checkPassword);
router.put("/verify-email", verifyEmail);


router.post("/mfa/setup", mfaSetup);
router.put("/mfa/enable", enableMFA);
router.post("/mfa/verify", mfaVerify);

// resend a verification email
router.post("/resend-verification-email", resendVerificationEmail);

// send a email with instructions to reset password
router.post("/send-password-reset-instructions", sendPasswordResetInstructions);
router.put("/reset-password", resetPassword);

// verify a user
router.get("/verify-token", verifyToken);

export default router;
