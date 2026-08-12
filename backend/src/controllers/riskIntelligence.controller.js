import {
  monitoringCapabilities,
  findMonitoringCapabilityById
} from "../data/monitoringCapabilities.js";
import {
  getPostureForObjective,
  buildOverviewSummary,
  listIdentifiedRisks,
  listRisksForObjective,
  levelForScore
} from "../data/riskOverview.js";
import {
  findRiskCaseById,
  findRiskCaseByObjectiveId,
  riskCases
} from "../data/riskCases.js";
import {
  enrichRiskCaseWithLiveEvidence,
  livePostureBumpForObjective
} from "../services/riskCaseEnrichment.service.js";
import {
  getRiskCaseReview,
  setRiskCaseReview,
  clearRiskCaseReview,
  isRiskCaseDismissed,
  listDismissedForObjective
} from "../data/riskCaseReviewStore.js";
import {
  evaluateOilCaseTrigger,
  OIL_CASE_ID
} from "../services/oilPriceMonitor.service.js";

/** Resolve human review state for a listed case. */
async function resolveReviewStatus(objectiveId, caseItem, oilTrigger) {
  const stored = getRiskCaseReview(objectiveId, caseItem.id);
  if (stored?.decision === "accept") return "accepted";
  if (stored?.decision === "reject" || stored?.decision === "delete") {
    return "dismissed";
  }

  const isOil =
    caseItem.caseId === OIL_CASE_ID || caseItem.id === OIL_CASE_ID;
  if (isOil) {
    if (!oilTrigger?.triggered) return "hidden";
    return "suggested";
  }

  // Published demo cases are already in the watch — treat as accepted.
  if (caseItem.hasCase) return "accepted";
  return "suggested";
}

/**
 * GET /api/risk/overview
 * Baseline illustrative posture + live evidence bumps when published cases have RawRecords.
 */
export async function getRiskOverview(req, res, next) {
  try {
    const objectives = [];
    for (const mo of monitoringCapabilities) {
      const posture = getPostureForObjective(mo.id);
      let score = posture.score;
      let live = null;
      if (posture.caseId && typeof score === "number") {
        live = await livePostureBumpForObjective(mo.id, posture.caseId);
        if (live?.scoreBump) {
          score = Math.min(99, score + live.scoreBump);
        }
      }
      const level = levelForScore(score);
      objectives.push({
        id: mo.id,
        name: mo.name,
        businessQuestion: mo.businessQuestion,
        description: mo.description,
        relatedRiskFactors: mo.relatedRiskFactors || [],
        ...posture,
        baselineScore: posture.score,
        score,
        scoreBump: live?.scoreBump || 0,
        level: level.key,
        levelLabel: level.label,
        liveBackedFactors: live?.liveBackedFactors || 0,
        liveSignals: live?.liveSignals || 0,
        illustrative: !(live?.liveBackedFactors > 0)
      });
    }

    objectives.sort((a, b) => (b.score || 0) - (a.score || 0));

    const summary = buildOverviewSummary(objectives);
    const risks = listIdentifiedRisks().map((r) => {
      const obj = objectives.find((o) => o.id === r.objectiveId);
      if (!obj?.scoreBump || !r.caseId) return r;
      const score = Math.min(99, r.score + Math.min(obj.scoreBump, 8));
      const level = levelForScore(score);
      return {
        ...r,
        baselineScore: r.score,
        score,
        level: level.key,
        levelLabel: level.label
      };
    });

    res.status(200).json({
      summary,
      objectives,
      risks,
      note:
        "Baseline scores are illustrative. Live connector evidence raises factor confidence and ticks scores when matching RawRecords exist."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/risk/objectives/:objectiveId/cases
 * Short list of risk cases under one monitoring objective.
 */
export async function getRiskCasesForObjective(req, res, next) {
  try {
    const { objectiveId } = req.params;
    const objective = findMonitoringCapabilityById(objectiveId);
    if (!objective) {
      return res.status(404).json({ error: "Monitoring objective not found" });
    }

    const posture = getPostureForObjective(objectiveId);
    const live = posture.caseId
      ? await livePostureBumpForObjective(objectiveId, posture.caseId)
      : null;
    const score =
      typeof posture.score === "number"
        ? Math.min(99, posture.score + (live?.scoreBump || 0))
        : posture.score;
    const level = levelForScore(score || 0);

    const oilTrigger =
      objectiveId === "commodity-energy-prices"
        ? await evaluateOilCaseTrigger()
        : null;

    const seenCaseIds = new Set();
    const cases = listRisksForObjective(objectiveId)
      .map((r) => {
        const published = r.caseId ? findRiskCaseById(r.caseId) : null;
        const caseScore =
          r.caseId && live?.scoreBump
            ? Math.min(99, r.score + Math.min(live.scoreBump, 8))
            : r.score;
        const caseLevel = levelForScore(caseScore);
        return {
          id: r.caseId || `prep:${r.name}`,
          riskDefinition: published?.riskDefinition || r.name,
          title: published?.title || r.name,
          summary: published?.summary || null,
          baselineScore: r.score,
          score: published ? published.score + (live?.scoreBump || 0) : caseScore,
          scoreBump: r.caseId ? live?.scoreBump || 0 : 0,
          level: caseLevel.key,
          levelLabel: caseLevel.label,
          caseId: r.caseId,
          status: r.caseId ? "published" : "inPreparation",
          hasCase: Boolean(r.caseId)
        };
      })
      .filter((c) => {
        // One card per published case (avoid duplicate titles from linked risks).
        if (!c.caseId) return true;
        if (seenCaseIds.has(c.caseId)) return false;
        seenCaseIds.add(c.caseId);
        return true;
      })
      .map((c) => {
        if (!c.hasCase) return c;
        const score = Math.min(99, Number(c.score) || 0);
        const caseLevel = levelForScore(score);
        return { ...c, score, level: caseLevel.key, levelLabel: caseLevel.label };
      });

    const casesWithReview = await Promise.all(
      cases.map(async (c) => {
        let summary = c.summary;
        if (
          (c.caseId === OIL_CASE_ID || c.id === OIL_CASE_ID) &&
          oilTrigger?.triggered
        ) {
          summary = `Brent $${oilTrigger.spotUsd?.toFixed(2)}/bbl vs Meyer budget $${oilTrigger.budgetUsd}/bbl (+${oilTrigger.variancePct}%) — AI proposes energy & logistics cost escalation.`;
        }
        const reviewStatus = await resolveReviewStatus(objectiveId, c, oilTrigger);
        const reviewed = getRiskCaseReview(objectiveId, c.id);
        const isOil = c.caseId === OIL_CASE_ID || c.id === OIL_CASE_ID;
        return {
          ...c,
          summary,
          reviewStatus,
          reviewedAt: reviewed?.reviewedAt || null,
          origin: isOil && reviewStatus === "suggested" ? "aiTriggered" : c.hasCase ? "published" : "aiSuggested",
          originLabel: isOil && reviewStatus === "suggested"
            ? "AI triggered · Brent above budget"
            : c.hasCase
              ? "Published case"
              : "AI suggested from monitoring signals",
          oilMetrics: isOil ? oilTrigger : undefined
        };
      })
    );

    const visible = casesWithReview.filter(
      (c) => c.reviewStatus !== "dismissed" && c.reviewStatus !== "hidden"
    );

    res.status(200).json({
      monitoringObjectiveId: objectiveId,
      objective: {
        id: objective.id,
        name: objective.name,
        businessQuestion: objective.businessQuestion,
        description: objective.description,
        ...posture,
        baselineScore: posture.score,
        score,
        scoreBump: live?.scoreBump || 0,
        level: level.key,
        levelLabel: level.label,
        liveBackedFactors: live?.liveBackedFactors || 0,
        liveSignals: live?.liveSignals || 0
      },
      cases: visible,
      oilMonitor: oilTrigger,
      counts: {
        total: visible.length,
        published: visible.filter((c) => c.hasCase).length,
        inPreparation: visible.filter((c) => !c.hasCase).length,
        suggested: visible.filter((c) => c.reviewStatus === "suggested").length,
        accepted: visible.filter((c) => c.reviewStatus === "accepted").length
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/risk/objectives/:objectiveId/cases/:caseListId/review
 * Body: { decision: "accept" | "reject" }
 * Human accepts or rejects an AI-suggested risk case from monitoring signals.
 */
export async function reviewRiskCaseForObjective(req, res, next) {
  try {
    const { objectiveId, caseListId: rawCaseListId } = req.params;
    const caseListId = decodeURIComponent(rawCaseListId);
    const objective = findMonitoringCapabilityById(objectiveId);
    if (!objective) {
      return res.status(404).json({ error: "Monitoring objective not found" });
    }

    const decision = String(req.body?.decision || "").toLowerCase();
    if (!["accept", "reject", "delete"].includes(decision)) {
      return res.status(400).json({
        error: 'decision must be "accept", "reject", or "delete"'
      });
    }

    const listed = listRisksForObjective(objectiveId);
    const match = listed.find((r) => {
      const id = r.caseId || `prep:${r.name}`;
      return id === caseListId || r.caseId === caseListId;
    });
    if (!match) {
      return res.status(404).json({ error: "Risk case not found for this objective" });
    }

    const resolvedId = match.caseId || `prep:${match.name}`;
    const entry = setRiskCaseReview(objectiveId, resolvedId, decision);

    res.status(200).json({
      monitoringObjectiveId: objectiveId,
      caseListId: resolvedId,
      caseId: match.caseId || null,
      riskDefinition: match.name,
      decision: entry.decision,
      reviewStatus: decision === "accept" ? "accepted" : "dismissed",
      reviewedAt: entry.reviewedAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/risk/cases/:caseId/review
 * Body: { decision: "accept" | "reject" | "delete" }
 */
export async function reviewRiskCaseByCaseId(req, res, next) {
  try {
    const { caseId } = req.params;
    const riskCase = findRiskCaseById(caseId);
    if (!riskCase) {
      return res.status(404).json({ error: "Risk case not found" });
    }

    const decision = String(req.body?.decision || "").toLowerCase();
    if (!["accept", "reject", "delete"].includes(decision)) {
      return res.status(400).json({
        error: 'decision must be "accept", "reject", or "delete"'
      });
    }

    const entry = setRiskCaseReview(
      riskCase.monitoringObjectiveId,
      caseId,
      decision
    );

    res.status(200).json({
      caseId,
      monitoringObjectiveId: riskCase.monitoringObjectiveId,
      decision: entry.decision,
      reviewStatus: decision === "accept" ? "accepted" : "dismissed",
      reviewedAt: entry.reviewedAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/risk/cases/:caseId/restore
 * Clears dismiss/delete so the case can reappear (e.g. next demo day).
 */
export async function restoreRiskCase(req, res, next) {
  try {
    const { caseId } = req.params;
    const riskCase = findRiskCaseById(caseId);
    if (!riskCase) {
      return res.status(404).json({ error: "Risk case not found" });
    }
    clearRiskCaseReview(riskCase.monitoringObjectiveId, caseId);
    const oilTrigger =
      riskCase.monitoringObjectiveId === "commodity-energy-prices"
        ? await evaluateOilCaseTrigger()
        : null;
    res.status(200).json({
      caseId,
      restored: true,
      oilMonitor: oilTrigger
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/risk/objectives/:objectiveId/cases/restore-dismissed
 * Clears reject/delete decisions so dismissed cases reappear (next demo run).
 */
export async function restoreDismissedCasesForObjective(req, res, next) {
  try {
    const { objectiveId } = req.params;
    const objective = findMonitoringCapabilityById(objectiveId);
    if (!objective) {
      return res.status(404).json({ error: "Monitoring objective not found" });
    }
    const dismissed = listDismissedForObjective(objectiveId);
    for (const d of dismissed) {
      clearRiskCaseReview(objectiveId, d.caseListId);
    }
    res.status(200).json({
      monitoringObjectiveId: objectiveId,
      restoredCount: dismissed.length,
      restored: dismissed.map((d) => d.caseListId)
    });
  } catch (error) {
    next(error);
  }
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
    if (
      isRiskCaseDismissed(riskCase.monitoringObjectiveId, riskCase.id)
    ) {
      return res.status(404).json({
        error: "Risk case dismissed",
        caseId: riskCase.id,
        dismissed: true,
        hint: "POST /api/risk/cases/:caseId/restore to show again in demo."
      });
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
