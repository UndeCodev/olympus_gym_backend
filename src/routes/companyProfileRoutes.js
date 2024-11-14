import { Router } from "express";
import fileUpload from "express-fileupload";

import { getCompanyProfile, updateCompanyProfile } from "../controllers/companyProfileController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { companyProfileRules } from '../validations/companyProfileValidation.js';

const router = Router();

router.get("/company-profile", getCompanyProfile);
router.post("/company-profile", fileUpload({ useTempFiles: true, tempFileDir: './public/img/logo'}), updateCompanyProfile);

export default router;
