// =============================================================================
// Transparent risk model (interim, frontend-only).
//
// Until the backend exposes a composite risk score per Monitoring Objective,
// the tiles compute one here from analyst assumptions — using the executive-
// standard likelihood × impact model on a 1–5 scale (a 5×5 risk matrix).
//
//   driver risk (raw)   = likelihood (1–5) × impact (1–5)  ∈ [1, 25]
//   driver score (0–100)= raw / 25 × 100                    (normalised)
//   objective score     = aggregation of driver scores      (see AGGREGATIONS)
//   level               = band of the 0–100 score           (see RISK_LEVELS)
//
// Everything is pure and explainable: each driver's contribution is returned so
// the UI can show *why* an objective scores what it does. No randomness.
// Swap this whole module for a backend field when scoring moves server-side.
// =============================================================================

export const SCALE_MAX = 5;

/** 1–5 anchors so the UI and analysts share one vocabulary. */
export const LIKELIHOOD_LABELS = {
  1: "Rare",
  2: "Unlikely",
  3: "Possible",
  4: "Likely",
  5: "Almost certain",
};
export const IMPACT_LABELS = {
  1: "Minor",
  2: "Moderate",
  3: "Significant",
  4: "Major",
  5: "Severe",
};

/**
 * Level bands on the normalised 0–100 score. Tunable in one place.
 * Calibrated against a 5×5 matrix: product ≥19/25 (≈76) reads Critical,
 * ≥15/25 (60) High, ≥11/25 (≈45) Elevated, below that Stable.
 */
export const RISK_LEVELS = [
  { key: "critical", label: "Critical risk", min: 75, color: "#D32F2F" },
  { key: "high", label: "High risk", min: 60, color: "#F57C00" },
  { key: "elevated", label: "Elevated risk", min: 45, color: "#E0A400" },
  { key: "stable", label: "Stable", min: 0, color: "#2E8B57" },
];

export function levelFor(score) {
  const s = Number(score) || 0;
  return RISK_LEVELS.find((l) => s >= l.min) || RISK_LEVELS[RISK_LEVELS.length - 1];
}

/** Clamp any input to the 1–5 scale (defensive against bad assumptions). */
export function clampScale(n) {
  const v = Math.round(Number(n) || 0);
  return Math.max(1, Math.min(SCALE_MAX, v));
}

/** Score a single driver → adds { likelihood, impact, raw (1–25), score (0–100) }. */
export function driverScore(driver) {
  const likelihood = clampScale(driver.likelihood);
  const impact = clampScale(driver.impact);
  const raw = likelihood * impact; // 1..25
  const score = Math.round((raw / (SCALE_MAX * SCALE_MAX)) * 100); // 0..100
  return { ...driver, likelihood, impact, raw, score };
}

/**
 * Aggregation methods — exposed so you can explore which behaviour fits.
 *  - weightedAverage: mean of weighted driver scores. Most explainable; a
 *    single severe driver can be diluted by many small ones.
 *  - softOr: probabilistic union 1 − Π(1 − s)^w. "Risk that at least one driver
 *    materialises" — one severe driver dominates; adding drivers never lowers it.
 *  - maxBlend: half the worst driver + half the weighted average. A pragmatic
 *    middle ground that respects the worst case without ignoring spread.
 */
export const AGGREGATIONS = ["weightedAverage", "softOr", "maxBlend"];

export function aggregate(scoredDrivers, method = "weightedAverage") {
  const drivers = scoredDrivers || [];
  if (drivers.length === 0) return 0;

  const weights = drivers.map((d) => {
    const w = d.weight == null ? 1 : Number(d.weight);
    return Number.isFinite(w) && w > 0 ? w : 1;
  });
  const totalW = weights.reduce((a, b) => a + b, 0) || 1;
  const s = drivers.map((d) => (Number(d.score) || 0) / 100); // 0..1

  if (method === "softOr") {
    const product = drivers.reduce((acc, _d, i) => acc * Math.pow(1 - s[i], weights[i]), 1);
    return Math.round((1 - product) * 100);
  }

  const weightedAvg = s.reduce((acc, v, i) => acc + v * weights[i], 0) / totalW;

  if (method === "maxBlend") {
    const max = Math.max(...s);
    return Math.round((0.5 * max + 0.5 * weightedAvg) * 100);
  }

  return Math.round(weightedAvg * 100); // weightedAverage (default)
}

/**
 * Full assessment for an objective's drivers.
 * Returns the composite score, its level, the per-driver breakdown (sorted
 * worst-first, each with its own score & contribution share), and the top driver.
 */
export function assessObjective(drivers, { method = "weightedAverage" } = {}) {
  const scored = (drivers || []).map(driverScore).sort((a, b) => b.score - a.score);
  const score = aggregate(scored, method);
  const level = levelFor(score);

  // Contribution share (of the summed weighted driver score) — for the UI.
  const weightedTotal = scored.reduce((acc, d) => acc + d.score * (d.weight == null ? 1 : d.weight), 0) || 1;
  const drivers2 = scored.map((d) => ({
    ...d,
    contribution: Math.round(((d.score * (d.weight == null ? 1 : d.weight)) / weightedTotal) * 100),
  }));

  return {
    score,
    level,
    method,
    drivers: drivers2,
    topDriver: drivers2[0] || null,
    driverCount: drivers2.length,
  };
}
