// Transparent risk model (interim). likelihood × impact on 1–5 → 0–100 score.
// See docs/Artefact Gallery/riskModel.js for the full rationale.

export const SCALE_MAX = 5;

export const RISK_LEVELS = [
  { key: "crit", label: "Critical risk", min: 75, color: "#D32F2F" },
  { key: "high", label: "High risk", min: 60, color: "#F57C00" },
  { key: "elev", label: "Elevated risk", min: 45, color: "#E0A400" },
  { key: "ok", label: "Stable", min: 0, color: "#2E8B57" },
];

export function levelFor(score) {
  const s = Number(score) || 0;
  return RISK_LEVELS.find((l) => s >= l.min) || RISK_LEVELS[RISK_LEVELS.length - 1];
}

export function clampScale(n) {
  const v = Math.round(Number(n) || 0);
  return Math.max(1, Math.min(SCALE_MAX, v));
}

export function driverScore(driver) {
  const likelihood = clampScale(driver.likelihood);
  const impact = clampScale(driver.impact);
  const raw = likelihood * impact;
  const score = Math.round((raw / (SCALE_MAX * SCALE_MAX)) * 100);
  return { ...driver, likelihood, impact, raw, score };
}

export function aggregate(scoredDrivers, method = "maxBlend") {
  const drivers = scoredDrivers || [];
  if (drivers.length === 0) return 0;

  const weights = drivers.map((d) => {
    const w = d.weight == null ? 1 : Number(d.weight);
    return Number.isFinite(w) && w > 0 ? w : 1;
  });
  const totalW = weights.reduce((a, b) => a + b, 0) || 1;
  const s = drivers.map((d) => (Number(d.score) || 0) / 100);

  if (method === "softOr") {
    const product = drivers.reduce(
      (acc, _d, i) => acc * Math.pow(1 - s[i], weights[i]),
      1
    );
    return Math.round((1 - product) * 100);
  }

  const weightedAvg = s.reduce((acc, v, i) => acc + v * weights[i], 0) / totalW;

  if (method === "maxBlend") {
    const max = Math.max(...s);
    return Math.round((0.5 * max + 0.5 * weightedAvg) * 100);
  }

  return Math.round(weightedAvg * 100);
}

export function assessObjective(drivers, { method = "maxBlend" } = {}) {
  const scored = (drivers || []).map(driverScore).sort((a, b) => b.score - a.score);
  const score = aggregate(scored, method);
  const level = levelFor(score);
  const weightedTotal =
    scored.reduce((acc, d) => acc + d.score * (d.weight == null ? 1 : d.weight), 0) || 1;
  const drivers2 = scored.map((d) => ({
    ...d,
    contribution: Math.round(
      ((d.score * (d.weight == null ? 1 : d.weight)) / weightedTotal) * 100
    ),
  }));

  return {
    score,
    level: level.key,
    levelLabel: level.label,
    color: level.color,
    method,
    drivers: drivers2,
    topDriver: drivers2[0] || null,
    driverCount: drivers2.length,
  };
}

/** Build a 6-month mock trend that ends at the composite score. */
export function mockTrendToScore(score, points = 7) {
  const end = Math.max(0, Math.min(100, Number(score) || 50));
  const start = Math.max(15, Math.min(95, end - 14 + ((end * 3) % 9)));
  const out = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wobble = Math.sin(i * 1.7) * 1.5;
    out.push(Math.round(start + (end - start) * t + wobble));
  }
  out[out.length - 1] = end;
  return out;
}
