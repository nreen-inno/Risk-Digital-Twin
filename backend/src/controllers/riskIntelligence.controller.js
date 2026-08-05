import {
  monitoringCapabilities,
  findMonitoringCapabilityById
} from "../data/monitoringCapabilities.js";
import {
  getPostureForObjective,
  buildOverviewSummary,
  listIdentifiedRisks,
  listRisksForObjective
} from "../data/riskOverview.js";
import {
  findRiskCaseById,
  findRiskCaseByObjectiveId,
  riskCases
} from "../data/riskCases.js";
import { enrichRiskCaseWithLiveEvidence } from "../services/riskCaseEnrichment.service.js";

/**
 * GET /api/risk/overview
 */
export function getRiskOverview(req, res) {
  const objectives = monitoringCapabilities.map((mo) => {
    const posture = getPostureForObjective(mo.id);
    return {
      id: mo.id,
      name: mo.name,
      businessQuestion: mo.businessQuestion,
      description: mo.description,
      relatedRiskFactors: mo.relatedRiskFactors || [],
      ...posture
    };
  });

  objectives.sort((a, b) => (b.score || 0) - (a.score || 0));

  const summary = buildOverviewSummary(objectives);
  const risks = listIdentifiedRisks();

  res.status(200).json({
    summary,
    objectives,
    risks,
    note: "Scores are illustrative demo posture until live risk scoring exists."
  });
}

/**
 * GET /api/risk/objectives/:objectiveId/cases
 * Short list of risk cases under one monitoring objective.
 */
export function getRiskCasesForObjective(req, res) {
  const { objectiveId } = req.params;
  const objective = findMonitoringCapabilityById(objectiveId);
  if (!objective) {
    return res.status(404).json({ error: "Monitoring objective not found" });
  }

  const posture = getPostureForObjective(objectiveId);
  const cases = listRisksForObjective(objectiveId).map((r) => {
    const published = r.caseId ? findRiskCaseById(r.caseId) : null;
    return {
      id: r.caseId || `prep:${r.name}`,
      riskDefinition: r.name,
      title: published?.title || r.name,
      summary: published?.summary || null,
      score: r.score,
      level: r.level,
      levelLabel: r.levelLabel,
      caseId: r.caseId,
      status: r.caseId ? "published" : "inPreparation",
      hasCase: Boolean(r.caseId)
    };
  });

  res.status(200).json({
    monitoringObjectiveId: objectiveId,
    objective: {
      id: objective.id,
      name: objective.name,
      businessQuestion: objective.businessQuestion,
      description: objective.description,
      ...posture
    },
    cases,
    counts: {
      total: cases.length,
      published: cases.filter((c) => c.hasCase).length,
      inPreparation: cases.filter((c) => !c.hasCase).length
    }
  });
}

/**
 * GET /api/risk/cases/:caseId
 */
export async function getRiskCaseById(req, res, next) {
  try {
    const riskCase = findRiskCaseById(req.params.caseId);
    if (!riskCase) {
      return res.status(404).json({ error: "Risk case not found" });
    }
    const enriched = await enrichRiskCaseWithLiveEvidence(riskCase);
    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/risk/objectives/:objectiveId/case
 * Legacy: first published case for an objective.
 */
export async function getRiskCaseForObjective(req, res, next) {
  try {
    const riskCase = findRiskCaseByObjectiveId(req.params.objectiveId);
    if (!riskCase) {
      return res.status(404).json({
        error: "No risk case published for this monitoring objective yet",
        monitoringObjectiveId: req.params.objectiveId,
        availableCaseIds: riskCases.map((c) => c.id)
      });
    }
    const enriched = await enrichRiskCaseWithLiveEvidence(riskCase);
    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
}
