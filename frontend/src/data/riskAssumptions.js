import { assessObjective, mockTrendToScore } from "../lib/riskModel.js";

/** Analyst mock assumptions (1–5 likelihood × impact). Matched by iconKey or id. */
export const OBJECTIVE_RISK_ASSUMPTIONS = {
  geopolitical: {
    drivers: [
      { name: "Sanctions & export controls", likelihood: 4, impact: 5, weight: 1.3 },
      { name: "Trade restrictions", likelihood: 4, impact: 4 },
      { name: "Regulatory change", likelihood: 3, impact: 4 },
    ],
  },
  "geopolitical-regulatory": {
    drivers: [
      { name: "Sanctions & export controls", likelihood: 4, impact: 5, weight: 1.3 },
      { name: "Trade restrictions", likelihood: 4, impact: 4 },
      { name: "Regulatory change", likelihood: 3, impact: 4 },
    ],
  },
  supplier: {
    drivers: [
      { name: "Supplier financial pressure", likelihood: 4, impact: 5, weight: 1.2 },
      { name: "Material availability", likelihood: 4, impact: 4 },
      { name: "Delivery performance", likelihood: 3, impact: 4 },
    ],
  },
  "supplier-stability": {
    drivers: [
      { name: "Supplier financial pressure", likelihood: 4, impact: 5, weight: 1.2 },
      { name: "Material availability", likelihood: 4, impact: 4 },
      { name: "Delivery performance", likelihood: 3, impact: 4 },
    ],
  },
  commodity: {
    drivers: [
      { name: "Commodity-price volatility", likelihood: 4, impact: 4 },
      { name: "Energy-price volatility", likelihood: 3, impact: 4 },
      { name: "Inflation", likelihood: 3, impact: 3 },
    ],
  },
  "commodity-energy-prices": {
    drivers: [
      { name: "Commodity-price volatility", likelihood: 4, impact: 4 },
      { name: "Energy-price volatility", likelihood: 3, impact: 4 },
      { name: "Inflation", likelihood: 3, impact: 3 },
    ],
  },
  weather: {
    drivers: [
      { name: "Severe weather", likelihood: 3, impact: 3 },
      { name: "Sea state", likelihood: 3, impact: 3 },
      { name: "Transport disruption", likelihood: 2, impact: 3 },
    ],
  },
  "weather-natural-hazards": {
    drivers: [
      { name: "Severe weather", likelihood: 3, impact: 3 },
      { name: "Sea state", likelihood: 3, impact: 3 },
      { name: "Transport disruption", likelihood: 2, impact: 3 },
    ],
  },
  customer: {
    drivers: [
      { name: "Customer demand softening", likelihood: 4, impact: 4 },
      { name: "Order-book deferral", likelihood: 3, impact: 5, weight: 1.1 },
      { name: "Customer credit pressure", likelihood: 3, impact: 4 },
    ],
  },
  "customer-commercial": {
    drivers: [
      { name: "Customer demand softening", likelihood: 4, impact: 4 },
      { name: "Order-book deferral", likelihood: 3, impact: 5, weight: 1.1 },
      { name: "Customer credit pressure", likelihood: 3, impact: 4 },
    ],
  },
  workforce: {
    drivers: [
      { name: "Workforce availability", likelihood: 3, impact: 3 },
      { name: "Skilled-labour capacity", likelihood: 2, impact: 3 },
      { name: "HSE / safety performance", likelihood: 2, impact: 3 },
    ],
  },
  "workforce-hse": {
    drivers: [
      { name: "Workforce availability", likelihood: 3, impact: 3 },
      { name: "Skilled-labour capacity", likelihood: 2, impact: 3 },
      { name: "HSE / safety performance", likelihood: 2, impact: 3 },
    ],
  },
};

function neutralDriversFromFactors(factors) {
  return (factors || []).slice(0, 4).map((f) => ({
    name: typeof f === "string" ? f : f.name,
    likelihood: 3,
    impact: 3,
  }));
}

export function assumptionsFor(objective) {
  if (!objective) return [];
  const set =
    OBJECTIVE_RISK_ASSUMPTIONS[objective.id] ||
    OBJECTIVE_RISK_ASSUMPTIONS[objective.iconKey];
  if (set?.drivers?.length) return set.drivers;
  return neutralDriversFromFactors(
    objective.relatedRiskFactors || objective.factors || objective.topDrivers
  );
}

/**
 * Enrich an overview objective with formula score, drivers, trend sparkline.
 */
export function enrichOverviewObjective(objective) {
  const factors = Array.isArray(objective.relatedRiskFactors)
    ? objective.relatedRiskFactors
    : objective.factors || [];
  const assessed = assessObjective(assumptionsFor({ ...objective, factors }), {
    method: "maxBlend",
  });
  const trend =
    Array.isArray(objective.trend) && objective.trend.length
      ? objective.trend
      : mockTrendToScore(assessed.score);

  const delta = trend.length >= 2 ? trend[trend.length - 1] - trend[0] : 0;

  return {
    ...objective,
    score: assessed.score,
    level: assessed.level,
    levelLabel: assessed.levelLabel,
    color: assessed.color,
    trend,
    trendDelta: delta,
    drivers: assessed.drivers.slice(0, 3).map((d) => ({
      name: d.name,
      score: d.score,
      color: assessed.color,
    })),
    factors: (factors || [])
      .map((f) =>
        typeof f === "string"
          ? f.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : f?.name || ""
      )
      .filter(Boolean)
      .slice(0, 6),
  };
}
