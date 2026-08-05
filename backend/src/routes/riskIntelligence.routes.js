import express from "express";
import {
  getRiskOverview,
  getRiskCaseById,
  getRiskCaseForObjective,
  getRiskCasesForObjective
} from "../controllers/riskIntelligence.controller.js";

const router = express.Router();

router.get("/overview", getRiskOverview);
router.get("/cases/:caseId", getRiskCaseById);
router.get("/objectives/:objectiveId/cases", getRiskCasesForObjective);
router.get("/objectives/:objectiveId/case", getRiskCaseForObjective);

export default router;
