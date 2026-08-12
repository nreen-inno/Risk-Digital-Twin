/**
 * In-memory human review decisions for AI-suggested risk cases.
 * Keyed by `${objectiveId}::${caseListId}`. Demo-scoped (resets on restart).
 */

const decisions = new Map();

function key(objectiveId, caseListId) {
  return `${objectiveId}::${caseListId}`;
}

export function getRiskCaseReview(objectiveId, caseListId) {
  return decisions.get(key(objectiveId, caseListId)) || null;
}

export function setRiskCaseReview(objectiveId, caseListId, decision) {
  const entry = {
    decision, // "accept" | "reject" | "delete"
    reviewedAt: new Date().toISOString()
  };
  decisions.set(key(objectiveId, caseListId), entry);
  return entry;
}

export function isRiskCaseDismissed(objectiveId, caseListId) {
  const stored = getRiskCaseReview(objectiveId, caseListId);
  return stored?.decision === "reject" || stored?.decision === "delete";
}

export function listDismissedForObjective(objectiveId) {
  const out = [];
  for (const [k, v] of decisions.entries()) {
    if (!k.startsWith(`${objectiveId}::`)) continue;
    if (v.decision === "reject" || v.decision === "delete") {
      out.push({ caseListId: k.split("::")[1], ...v });
    }
  }
  return out;
}

export function clearRiskCaseReview(objectiveId, caseListId) {
  decisions.delete(key(objectiveId, caseListId));
}
