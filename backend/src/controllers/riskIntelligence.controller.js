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
      cases,
      counts: {
        total: cases.length,
        published: cases.filter((c) => c.hasCase).length,
        inPreparation: cases.filter((c) => !c.hasCase).length
      }
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
