import express from "express";
import {
  getRiskOverview,
  getRiskCaseById,
  getRiskCaseForObjective,
  getRiskCasesForObjective,
  reviewRiskCaseForObjective,
  reviewRiskCaseByCaseId,
  restoreRiskCase,
  restoreDismissedCasesForObjective
} from "../controllers/riskIntelligence.controller.js";

const router = express.Router();

router.get("/overview", getRiskOverview);
router.get("/cases/:caseId", getRiskCaseById);
router.post("/cases/:caseId/review", reviewRiskCaseByCaseId);
router.post("/cases/:caseId/restore", restoreRiskCase);
router.get("/objectives/:objectiveId/cases", getRiskCasesForObjective);
router.post(
  "/objectives/:objectiveId/cases/restore-dismissed",
  restoreDismissedCasesForObjective
);
router.post(
  "/objectives/:objectiveId/cases/:caseListId/review",
  reviewRiskCaseForObjective
);
router.get("/objectives/:objectiveId/case", getRiskCaseForObjective);

export default router;
