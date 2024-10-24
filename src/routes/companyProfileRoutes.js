import { Router } from "express";
import { getCompanyProfile, updateCompanyProfile } from "../controllers/companyProfileController.js";

import fileUpload from "express-fileupload";

const router = Router();

router.get("/company-profile", getCompanyProfile);
router.post("/company-profile", fileUpload({ useTempFiles: true, tempFileDir: './public/img/logo'}), updateCompanyProfile);

export default router;
