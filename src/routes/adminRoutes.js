import { Router } from "express";
import { getEmailConfigurationByTypeEmail, updateEmailConfigurationByTypeEmail } from "../controllers/emailsConfigsController.js";

const router = Router();

router.post("/emails-settings", getEmailConfigurationByTypeEmail);
router.put("/emails-settings", updateEmailConfigurationByTypeEmail);

export default router;
