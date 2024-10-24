import { Router } from "express";
import { createPrivacyPolicy, deletePrivacyPolicy, getPrivacyPolicies, updatePrivacyPolicy } from "../controllers/privacyPolicyController.js";

import { createTermsAndConditions, deleteTermsAndConditions, getTermsAndConditions, updateTermsAndConditions } from "../controllers/termsAndConditions.js";

import { createLegalDisclaimer, deleteLegalDisclaimer, getLegalDisclaimer, updateLegalDisclaimer } from "../controllers/legalDisclaimer.js";


const router = Router();

// CRUD políticas de privacidad
router.get("/privacy-policies", getPrivacyPolicies);
router.post("/privacy-policy", createPrivacyPolicy);
router.put("/privacy-policy/:id", updatePrivacyPolicy);
router.delete("/privacy-policy/:id", deletePrivacyPolicy);

// CRUD términos y condiciones
router.get("/terms-and-conditions", getTermsAndConditions);
router.post("/terms-and-conditions", createTermsAndConditions);
router.put("/terms-and-conditions/:id", updateTermsAndConditions);
router.delete("/terms-and-conditions/:id", deleteTermsAndConditions);

// CRUD deslinde legal
router.get("/legal-disclaimer", getLegalDisclaimer);
router.post("/legal-disclaimer", createLegalDisclaimer);
router.put("/legal-disclaimer/:id", updateLegalDisclaimer);
router.delete("/legal-disclaimer/:id", deleteLegalDisclaimer);

export default router;
