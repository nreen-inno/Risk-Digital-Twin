/**
 * Demo risk cases (illustrative intelligence payloads).
 * Artefact Gallery HTML remains documentation; this is the app API source.
 */

const riskCases = [
  {
    id: "customs-trade-disruption",
    monitoringObjectiveId: "geopolitical-regulatory",
    categoryLabel: "Geopolitical · Trade",
    riskDefinition: "Customs & Trade Disruption",
    enterpriseCategory: "Regulatory · Supply Chain",
    level: "high",
    score: 74,
    accent: "#F57C00",
    trend: [55, 58, 60, 64, 68, 71, 74],
    title: "China export restrictions & tariffs on critical materials",
    summary:
      "New export-licensing requirements and tariff changes are tightening access to specialty steel, castings and certain electronics sourced from China and routed via Asia–Europe lanes. The effect is portfolio-wide: it lengthens transport, raises landed cost, and injects licensing uncertainty into procurement for every programme drawing on those categories.",
    /** Only RawRecords matching these themes appear as live evidence on this case. */
    relevanceKeywords: [
      "sanction",
      "export",
      "tariff",
      "customs",
      "trade",
      "china",
      "licen",
      "duty",
      "transit",
      "asia",
      "steel",
      "cast",
      "restrict",
      "embargo",
      "vessel",
      "fsf",
      "dual-use",
      "procurement",
      "freight",
      "shipping"
    ],
    factors: [
      {
        name: "Export licensing added for specialty steel & castings",
        severity: "crit",
        observation:
          "New export-licence requirement published for specialty steel and castings.",
        sourceName: "European Commission news & updates",
        tier: "external",
        when: "1d ago",
        confidence: 89
      },
      {
        name: "Tariff step-up raising landed procurement cost 8–15%",
        severity: "high",
        observation:
          "Tariff schedule change; landed cost +8–15% on affected HS codes.",
        sourceName: "Government & customs authority bulletins",
        tier: "external",
        when: "2d ago",
        confidence: 82
      },
      {
        name: "Asia–Europe transit lengthening; capacity tight",
        severity: "high",
        observation:
          "Transit +3–5 wk; capacity constrained on Asia–EU lanes.",
        sourceName: "Internal ERP / Procurement",
        tier: "internal",
        when: "2d ago",
        confidence: 76
      },
      {
        name: "Currency (EUR/USD) amplifying cost swings",
        severity: "elev",
        observation:
          "EUR/USD moved ~4%; landed-cost volatility on USD-priced inputs.",
        sourceName: "Financial-market feed",
        tier: "external",
        when: "4d ago",
        confidence: 71
      }
    ],
    sources: [
      {
        name: "European Commission news & updates",
        tier: "external",
        evidence: "evidences: export licensing",
        observations: 4,
        updated: "1d ago"
      },
      {
        name: "Government & customs authority bulletins",
        tier: "external",
        evidence: "evidences: tariff step-up",
        observations: 3,
        updated: "2d ago"
      },
      {
        name: "Internal ERP / Procurement",
        tier: "internal",
        evidence: "evidences: transport time & cost",
        observations: 2,
        updated: "2d ago"
      },
      {
        name: "IMO regulatory updates",
        tier: "external",
        evidence: "evidences: regulatory change (supporting)",
        observations: 2,
        updated: "3d ago"
      }
    ],
    provenance: {
      sources: 4,
      observations: 11,
      confidence: 80,
      updated: "3h ago",
      illustrative: true
    },
    impacts: [
      { value: "+11%", label: "Weighted landed cost on affected categories" },
      { value: "+3–5 wk", label: "Added transport duration, Asia lanes" },
      { value: "€24M", label: "Annualised budget pressure across portfolio" },
      { value: "4 of 6", label: "Programmes drawing on restricted categories" }
    ],
    network: {
      lanes: [
        "Risk sources",
        "Risk factors",
        "Risk",
        "Linked risks",
        "Enterprise impact"
      ],
      nodes: [
        { id: "src1", name: "European Commission", lane: 0, level: "src" },
        { id: "src2", name: "Customs bulletins", lane: 0, level: "src" },
        { id: "src3", name: "Internal ERP", lane: 0, level: "src" },
        { id: "f1", name: "Export licensing", lane: 1, level: "crit" },
        { id: "f2", name: "Tariff step-up +8–15%", lane: 1, level: "high" },
        { id: "f3", name: "Transit time ↑", lane: 1, level: "high" },
        { id: "f4", name: "EUR/USD volatility", lane: 1, level: "elev" },
        {
          id: "r1",
          name: "Customs & Trade Disruption",
          lane: 2,
          level: "high",
          current: true
        },
        { id: "l1", name: "Material shortage", lane: 3, level: "high" },
        { id: "l2", name: "Supplier insolvency", lane: 3, level: "high" },
        { id: "l3", name: "Cost overrun", lane: 3, level: "high" },
        { id: "i1", name: "Procurement cost → budget", lane: 4, level: "high" },
        { id: "i2", name: "Schedule pressure", lane: 4, level: "high" },
        { id: "i3", name: "Delivery confidence ↓", lane: 4, level: "high" }
      ],
      links: [
        ["src1", "f1"],
        ["src2", "f2"],
        ["src3", "f3"],
        ["src2", "f4"],
        ["f1", "r1"],
        ["f2", "r1"],
        ["f3", "r1"],
        ["f4", "r1"],
        ["r1", "l1"],
        ["r1", "l2"],
        ["r1", "l3"],
        ["l1", "i2"],
        ["l1", "i3"],
        ["l2", "i2"],
        ["l3", "i1"]
      ]
    },
    actions: [
      {
        priority: 1,
        title: "Dual-region sourcing for restricted categories",
        detail:
          "Stand up qualified EU/Turkey/Korea alternates for specialty steel and castings.",
        effects: [
          { label: "Availability risk −40%" },
          { label: "Landed cost −4%" }
        ]
      },
      {
        priority: 2,
        title: "Reserve logistics capacity & re-route",
        detail:
          "Lock forward freight capacity and shift critical flows to less-exposed lanes.",
        effects: [
          { label: "Transport time −2 wk" },
          { label: "Freight cost +€1.2M", warn: true }
        ]
      },
      {
        priority: 2,
        title: "Customs & tariff engineering review",
        detail:
          "Reclassify where legitimate, use bonded warehousing and origin planning.",
        effects: [{ label: "Duty cost −3–6%" }]
      },
      {
        priority: 3,
        title: "Forward-buy & FX hedge on key inputs",
        detail: "Hedge 2–3 quarters of the most price-volatile categories.",
        effects: [{ label: "Budget variance −50%" }]
      }
    ],
    aiInsight: {
      html: "Probability the restrictions persist through the next 2 quarters: <b>High (~70%)</b>. Dual-sourcing plus tariff engineering is modelled to recover <b>~5–7 pts</b> of the cost pressure.",
      confidence: 73
    }
  }
];

export { riskCases };

export function findRiskCaseById(id) {
  return riskCases.find((c) => c.id === id) || null;
}

export function findRiskCaseByObjectiveId(objectiveId) {
  return (
    riskCases.find((c) => c.monitoringObjectiveId === objectiveId) || null
  );
}
