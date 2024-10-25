import { Router } from "express";
import { createPrivacyPolicy, deletePrivacyPolicy, getPrivacyEnable, getPrivacyPolicies, updatePrivacyPolicy } from "../controllers/privacyPolicyController.js";

import { createTermsAndConditions, deleteTermsAndConditions, getTermsAndConditions, getTermsEnable, updateTermsAndConditions } from "../controllers/termsAndConditions.js";

import { createLegalDisclaimer, deleteLegalDisclaimer, getLegalDisclaimer, getLegalDisclaimerEnable, updateLegalDisclaimer } from "../controllers/legalDisclaimer.js";


const router = Router();

// CRUD políticas de privacidad
router.get("/privacy-policies", getPrivacyPolicies);
router.get("/privacy-policy", getPrivacyEnable);
router.post("/privacy-policy", createPrivacyPolicy);
router.put("/privacy-policy/:id", updatePrivacyPolicy);
router.delete("/privacy-policy/:id", deletePrivacyPolicy);

// CRUD términos y condiciones
router.get("/terms-and-conditions", getTermsAndConditions);
router.get("/term-and-condition", getTermsEnable);
router.post("/terms-and-conditions", createTermsAndConditions);
router.put("/terms-and-conditions/:id", updateTermsAndConditions);
router.delete("/terms-and-conditions/:id", deleteTermsAndConditions);

// CRUD deslinde legal
router.get("/legal-disclaimer", getLegalDisclaimer);
router.get("/legal-disclaimer-public", getLegalDisclaimerEnable);
router.post("/legal-disclaimer", createLegalDisclaimer);
router.put("/legal-disclaimer/:id", updateLegalDisclaimer);
router.delete("/legal-disclaimer/:id", deleteLegalDisclaimer);

export default router;
