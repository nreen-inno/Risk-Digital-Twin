/**
 * Demo risk posture per monitoring objective (illustrative scores).
 * Aligned with Artefact Gallery risk-overview.html for the Aug demo.
 */

const LEVELS = [
  { key: "crit", label: "Critical risk", min: 75 },
  { key: "high", label: "High risk", min: 60 },
  { key: "elev", label: "Elevated risk", min: 45 },
  { key: "ok", label: "Stable", min: 0 }
];

export function levelForScore(score) {
  const s = Number(score) || 0;
  return LEVELS.find((l) => s >= l.min) || LEVELS[LEVELS.length - 1];
}

/** Mock posture keyed by monitoringCapabilities.js ids */
const postureByObjectiveId = {
  "geopolitical-regulatory": {
    score: 78,
    trend: [60, 62, 61, 66, 70, 74, 78],
    topDrivers: [
      "Sanctions & export controls",
      "Trade restrictions",
      "Regulatory change"
    ],
    caseId: "customs-trade-disruption",
    hasCase: true
  },
  "supplier-stability": {
    score: 64,
    trend: [54, 56, 58, 57, 60, 62, 64],
    topDrivers: [
      "Supplier financial pressure",
      "Material availability",
      "Delivery performance"
    ],
    caseId: null,
    hasCase: false
  },
  "weather-natural-hazards": {
    score: 42,
    trend: [48, 46, 45, 43, 41, 40, 42],
    topDrivers: ["Severe weather", "Sea state", "Transport disruption"],
    caseId: "yard-weather-disruption",
    hasCase: true
  },
  "commodity-energy-prices": {
    score: 62,
    trend: [48, 50, 52, 55, 58, 60, 62],
    topDrivers: [
      "European steel prices",
      "Import quota / CBAM",
      "Procurement cost pressure"
    ],
    caseId: "steel-supply-cost-pressure",
    hasCase: true
  },
  "customer-commercial": {
    score: 68,
    trend: [52, 54, 53, 57, 61, 65, 68],
    topDrivers: [
      "Customer demand softening",
      "Order-book deferral",
      "Customer credit pressure"
    ],
    caseId: null,
    hasCase: false
  },
  "workforce-hse": {
    score: 34,
    trend: [40, 39, 38, 37, 36, 35, 34],
    topDrivers: [
      "Workforce availability",
      "Skilled-labour capacity",
      "HSE / safety performance"
    ],
    caseId: null,
    hasCase: false
  }
};

export function getPostureForObjective(objectiveId) {
  const posture = postureByObjectiveId[objectiveId];
  if (!posture) {
    return {
      score: null,
      level: null,
      trend: [],
      topDrivers: [],
      caseId: null,
      hasCase: false,
      illustrative: true
    };
  }
  const level = levelForScore(posture.score);
  return {
    ...posture,
    level: level.key,
    levelLabel: level.label,
    illustrative: true
  };
}

export function buildOverviewSummary(objectivePostures) {
  const scored = objectivePostures.filter((o) => typeof o.score === "number");
  const critical = scored.filter((o) => o.score >= 75).length;
  const overall =
    scored.length === 0
      ? 0
      : Math.round(scored.reduce((a, o) => a + o.score, 0) / scored.length);
  const overallLevel = levelForScore(overall);
  return {
    overallScore: overall,
    overallLevel: overallLevel.key,
    overallLevelLabel: overallLevel.label,
    criticalObjectives: critical,
    objectivesMonitored: scored.length,
    illustrative: true,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Identified risks (risk definitions) for the overview rail.
 * caseId opens the in-app case when published; null = in preparation.
 */
const identifiedRisks = [
  {
    name: "Supplier insolvency",
    objectiveId: "supplier-stability",
    objectiveName: "Supplier Stability",
    score: 83,
    caseId: null
  },
  {
    name: "Customs & trade disruption",
    objectiveId: "geopolitical-regulatory",
    objectiveName: "Geopolitical & Regulatory",
    score: 78,
    caseId: "customs-trade-disruption"
  },
  {
    name: "Customer order deferral",
    objectiveId: "customer-commercial",
    objectiveName: "Customer & Commercial",
    score: 68,
    caseId: null
  },
  {
    name: "Material shortage",
    objectiveId: "supplier-stability",
    objectiveName: "Supplier Stability",
    score: 60,
    caseId: null
  },
  {
    name: "Regulatory compliance failure",
    objectiveId: "geopolitical-regulatory",
    objectiveName: "Geopolitical & Regulatory",
    score: 60,
    caseId: null
  },
  {
    name: "Sanctions programme expansion",
    objectiveId: "geopolitical-regulatory",
    objectiveName: "Geopolitical & Regulatory",
    score: 66,
    caseId: null
  },
  {
    name: "Late delivery",
    objectiveId: "supplier-stability",
    objectiveName: "Supplier Stability",
    score: 56,
    caseId: null
  },
  {
    name: "Steel supply & cost pressure",
    objectiveId: "commodity-energy-prices",
    objectiveName: "Commodity & Energy",
    score: 62,
    caseId: "steel-supply-cost-pressure"
  },
  {
    name: "Energy & logistics cost escalation",
    objectiveId: "commodity-energy-prices",
    objectiveName: "Commodity & Energy",
    score: 54,
    caseId: "energy-oil-cost-escalation"
  },
  {
    name: "Budget overrun",
    objectiveId: "commodity-energy-prices",
    objectiveName: "Commodity & Energy",
    score: 55,
    caseId: null
  },
  {
    name: "Procurement cost increase",
    objectiveId: "commodity-energy-prices",
    objectiveName: "Commodity & Energy",
    score: 50,
    caseId: null
  },
  {
    name: "Project schedule delay",
    objectiveId: "supplier-stability",
    objectiveName: "Supplier Stability",
    score: 48,
    caseId: null
  },
  {
    name: "Weather & outdoor work disruption",
    objectiveId: "weather-natural-hazards",
    objectiveName: "Weather & Natural Hazards",
    score: 42,
    caseId: "yard-weather-disruption"
  },
  {
    name: "Sea trial delay",
    objectiveId: "weather-natural-hazards",
    objectiveName: "Weather & Natural Hazards",
    score: 44,
    caseId: null
  }
];

export function listIdentifiedRisks() {
  return identifiedRisks
    .map((r) => {
      const level = levelForScore(r.score);
      return {
        ...r,
        level: level.key,
        levelLabel: level.label,
        hasCase: Boolean(r.caseId)
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Risk cases / definitions belonging to one monitoring objective. */
export function listRisksForObjective(objectiveId) {
  return listIdentifiedRisks().filter((r) => r.objectiveId === objectiveId);
}

export { postureByObjectiveId };
