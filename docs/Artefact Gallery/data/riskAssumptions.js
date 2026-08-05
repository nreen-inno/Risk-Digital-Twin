// =============================================================================
// Interim risk assumptions (analyst-set), consumed by lib/riskModel.js.
//
// This is the ONLY place the "test version" numbers live. When the backend
// starts returning real driver likelihood/impact (or a finished risk score),
// delete this file and feed backend data into assessObjective() instead.
//
// Likelihood & Impact are on a 1–5 scale (see LIKELIHOOD_LABELS / IMPACT_LABELS
// in lib/riskModel.js). Optional per-driver `weight` (default 1) marks a driver
// as more/less important to the objective.
//
// Objectives are matched by iconKey (stable: geopolitical | supplier | commodity
// | weather | generic), which the API derives for every objective — so these
// assumptions attach without needing exact backend ids. Anything unmatched
// falls back to a neutral model built from the objective's own risk factors.
// =============================================================================

import { assessObjective } from "../lib/riskModel.js";

export const OBJECTIVE_RISK_ASSUMPTIONS = {
  geopolitical: {
    drivers: [
      { name: "China export restrictions", likelihood: 4, impact: 5, weight: 1.3 },
      { name: "Trade policy & tariffs", likelihood: 4, impact: 4 },
      { name: "Sanctions & export controls", likelihood: 3, impact: 4 },
      { name: "IMO / classification change", likelihood: 3, impact: 3 },
    ],
  },
  supplier: {
    drivers: [
      { name: "Single-source exposure", likelihood: 4, impact: 5, weight: 1.2 },
      { name: "Supplier financial pressure", likelihood: 4, impact: 4 },
      { name: "Delivery reliability", likelihood: 3, impact: 4 },
      { name: "Material availability", likelihood: 3, impact: 3 },
    ],
  },
  commodity: {
    drivers: [
      { name: "Steel & copper prices (MEPS)", likelihood: 4, impact: 4 },
      { name: "Inflation & interest rates", likelihood: 3, impact: 3 },
      { name: "Exchange rate EUR/USD", likelihood: 3, impact: 3 },
    ],
  },
  weather: {
    drivers: [
      { name: "Severe weather disruption", likelihood: 3, impact: 3 },
      { name: "Seasonal transport delay", likelihood: 3, impact: 2 },
    ],
  },
};

/** Neutral default when we have no tuned assumptions: use the objective's own
 *  risk factors at a mid likelihood/impact so the score is defined but clearly
 *  "unset" (and editable). */
export function neutralDriversFromFactors(factors) {
  return (factors || []).map((f) => ({ name: f, likelihood: 3, impact: 3 }));
}

/** Resolve the driver assumptions for an objective (tuned → neutral fallback). */
export function assumptionsFor(objective) {
  if (!objective) return [];
  const set =
    OBJECTIVE_RISK_ASSUMPTIONS[objective.id] || OBJECTIVE_RISK_ASSUMPTIONS[objective.iconKey];
  if (set && set.drivers && set.drivers.length) return set.drivers;
  return neutralDriversFromFactors(objective.factors);
}

/**
 * Convenience: assess a normalized objective end-to-end.
 * `objective` is the shape from api.normalizeObjective (has id, iconKey, factors).
 * Returns the assessObjective() result plus `tuned` (false when we fell back to
 * neutral factor-based drivers, so the UI can show "estimated" honestly).
 */
// Default aggregation is `maxBlend`: with a handful of moderate drivers,
// weightedAverage under-scores (a single severe driver is diluted) and softOr
// saturates near 100 (losing discrimination between objectives). maxBlend —
// half the worst driver, half the weighted average — tracks executive intuition
// best. Override per call to explore the alternatives.
export function scoreObjective(objective, { method = "maxBlend" } = {}) {
  const drivers = assumptionsFor(objective);
  const tuned = !!(
    OBJECTIVE_RISK_ASSUMPTIONS[objective?.id] || OBJECTIVE_RISK_ASSUMPTIONS[objective?.iconKey]
  );
  return { ...assessObjective(drivers, { method }), tuned };
}
