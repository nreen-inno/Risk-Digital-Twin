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
    /**
     * Soft thematic terms — used only AFTER an anchor hit.
     * Avoid bare "customs" / "trade" as sole proof of China risk.
     */
    relevanceKeywords: [
      "sanction",
      "export",
      "tariff",
      "duty",
      "licen",
      "steel",
      "cast",
      "restrict",
      "embargo",
      "dual-use",
      "procurement",
      "anti-dump",
      "antidumping",
      "fsf",
      "trade defence",
      "trade defense",
      "export control",
      "export-control"
    ],
    /**
     * Hard geo/entity anchors for this case. At least one must appear.
     * Generic WCO "customs" news without China must not attach here.
     */
    relevanceAnchorKeywords: ["china", "chinese", "prc", "people's republic of china"],
    /** @deprecated prefer relevanceAnchorKeywords; kept empty so old core OR-logic does not loosen. */
    relevanceCoreKeywords: [],
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
      {
        value: "+11%",
        label: "Weighted landed cost on affected categories",
        explain: {
          what: "The average rise in fully-loaded purchase cost (material + duty + freight + FX) across the procurement categories hit by the restrictions, weighted by each category's share of spend.",
          formula:
            "Σ ( category spend share × category landed-cost increase )",
          inputs: [
            {
              k: "Specialty steel — 45% of affected spend × +14%",
              v: "+6.3%",
              source: "ERP + MEPS"
            },
            {
              k: "Castings — 30% × +9%",
              v: "+2.7%",
              source: "ERP + Customs"
            },
            {
              k: "Electronics — 25% × +8%",
              v: "+2.0%",
              source: "ERP"
            }
          ],
          result: "Weighted total = 6.3 + 2.7 + 2.0 = +11.0%",
          assumptions: [
            "Current category spend mix holds over the horizon (illustrative portfolio weights until ERP is connected).",
            "Tariff applies to the full category, not a sub-set of HS codes.",
            "FX effect held at the quarter-average EUR/USD."
          ],
          sources: [
            "Internal ERP / Procurement",
            "Customs authority bulletins",
            "MEPS steel price",
            "EU Trade news (live theme match)"
          ],
          confidence: 80,
          updated: "3h ago"
        }
      },
      {
        value: "+3–5 wk",
        label: "Added transport duration, Asia lanes",
        explain: {
          what: "Extra end-to-end transit time for Asia→Europe shipments versus the baseline, shown as a low–high range across optimistic and cautious scenarios.",
          formula:
            "ocean-lane delay + export-licence processing hold (low … high)",
          inputs: [
            {
              k: "Ocean transit congestion",
              v: "+2–3 wk",
              source: "Freight index"
            },
            {
              k: "Export-licence processing",
              v: "+1–2 wk",
              source: "Customs bulletins"
            }
          ],
          result: "Low 3 wk … High 5 wk",
          assumptions: [
            "Licence lead-times stay within the recently observed range.",
            "No full lane closure (that would move this to a scenario simulator)."
          ],
          sources: [
            "Internal ERP / logistics",
            "Government & customs authority bulletins"
          ],
          confidence: 76,
          updated: "2d ago"
        }
      },
      {
        value: "€24M",
        label: "Annualised budget pressure across portfolio",
        explain: {
          what: "The extra procurement + logistics cost across every affected programme if these conditions persist for twelve months — the portfolio-level euro consequence of the +11% and the freight premium.",
          formula:
            "affected annual spend × weighted cost increase + annual freight premium",
          inputs: [
            {
              k: "Affected annual spend",
              v: "€205M",
              source: "ERP spend"
            },
            {
              k: "Weighted cost increase (from +11% tile)",
              v: "×11%",
              source: "derived"
            },
            {
              k: "Sub-total",
              v: "€22.6M",
              source: "derived"
            },
            {
              k: "Annual freight / re-routing premium",
              v: "+€1.4M",
              source: "Freight index"
            }
          ],
          result: "€22.6M + €1.4M ≈ €24M / year",
          assumptions: [
            "Restrictions persist a full 12 months (illustrative horizon).",
            "No mitigation applied — gross exposure before recommended actions.",
            "Spend base is a demo default until ERP spend is connected."
          ],
          sources: ["Internal ERP / Procurement", "Freight index"],
          confidence: 78,
          updated: "3h ago"
        }
      },
      {
        value: "4 of 6",
        label: "Programmes drawing on restricted categories",
        explain: {
          what: "How many of the six active newbuild programmes have at least one bill-of-materials line in a restricted category — i.e. how wide the exposure is across the portfolio.",
          formula: "count( programmes where restricted BOM lines ≥ 1 )",
          inputs: [
            {
              k: "Active newbuild programmes",
              v: "6",
              source: "Programme register"
            },
            {
              k: "…with ≥1 restricted BOM line",
              v: "4",
              source: "ERP / BOM"
            }
          ],
          result: "4 of 6 programmes exposed",
          assumptions: [
            "BOM category tags are illustrative until ERP sync is live.",
            "A single restricted line is enough to flag a programme as exposed."
          ],
          sources: ["Internal ERP / BOM", "Programme register"],
          confidence: 88,
          updated: "1d ago"
        }
      }
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
  },
  {
    id: "steel-supply-cost-pressure",
    monitoringObjectiveId: "commodity-energy-prices",
    categoryLabel: "Commodity · Materials",
    riskDefinition: "Steel supply & cost pressure",
    enterpriseCategory: "Supply Chain · Procurement",
    level: "elev",
    score: 58,
    accent: "#156082",
    trend: [48, 50, 52, 54, 55, 57, 58],
    title: "European steel supply tightening & HRC/plate cost pressure",
    summary:
      "European hot-rolled coil and plate markets are edging higher as supply tightens. From July 2026 the EU steel safeguard caps duty-free imports at 18.3 million tonnes per year, with a 50% duty on out-of-quota volumes; CBAM adds a further carbon-cost layer on covered imports. Because plate and related steel grades are core shipbuilding inputs, tighter European availability and higher prices can raise hull and outfitting procurement cost, stretch supplier lead times, and put pressure on project margins across the newbuild portfolio. This case tracks that exposure — it does not assert that programmes are already impacted.",
    /**
     * No geo anchor — European steel / trade policy articles match on material terms.
     * Source text rarely names the yard; reasoning is via shipbuilding input exposure.
     */
    relevanceKeywords: [
      "steel",
      "hrc",
      "hot-rolled",
      "hot rolled",
      "coil",
      "plate",
      "shipbuilding",
      "ship plate",
      "hull",
      "procurement",
      "material",
      "alloy",
      "cbam",
      "safeguard",
      "quota",
      "import",
      "duty",
      "tight",
      "supply",
      "availability",
      "lead time",
      "price",
      "cost",
      "meps",
      "commodity",
      "carbon border"
    ],
    relevanceCoreKeywords: [
      "steel",
      "hrc",
      "coil",
      "plate",
      "cbam",
      "safeguard",
      "quota",
      "hot-rolled",
      "shipbuilding"
    ],
    relevanceAnchorKeywords: [],
    factors: [
      {
        name: "European HRC / plate prices trending higher",
        severity: "high",
        observation:
          "European hot-rolled coil benchmarks edging up as supply tightens — shipbuilding plate follows with a lag.",
        sourceName: "Steel market news / MEPS",
        tier: "external",
        when: "awaiting live",
        confidence: 52
      },
      {
        name: "EU import quota & 50% out-of-quota duty (July 2026 regime)",
        severity: "high",
        observation:
          "Duty-free steel imports capped at 18.3 Mt/year; volumes above quota face 50% duty — reshaping landed cost for non-EU plate.",
        sourceName: "EU Commission Trade / policy",
        tier: "external",
        when: "awaiting live",
        confidence: 55
      },
      {
        name: "Tighter European availability & longer procurement lead times",
        severity: "elev",
        observation:
          "Mill allocations and delivery windows lengthen when regional supply tightens — affects hull block and outfitting schedules.",
        sourceName: "Supplier quotations / market reporting",
        tier: "external",
        when: "awaiting live",
        confidence: 48
      },
      {
        name: "CBAM carbon-cost layer on imports",
        severity: "elev",
        observation:
          "Definitive CBAM regime adds embedded-carbon reporting and cost on covered imports — incremental landed-cost pressure.",
        sourceName: "EU regulatory / trade policy",
        tier: "external",
        when: "awaiting live",
        confidence: 50
      }
    ],
    sources: [
      {
        name: "EU Commission Trade news & steel measures",
        tier: "external",
        evidence: "evidences: safeguard / quota regime",
        observations: 3,
        updated: "awaiting live"
      },
      {
        name: "European steel-market reporting",
        tier: "external",
        evidence: "evidences: HRC / plate price movement",
        observations: 2,
        updated: "awaiting live"
      },
      {
        name: "Internal procurement / BOM",
        tier: "internal",
        evidence: "evidences: plate spend exposure (illustrative)",
        observations: 1,
        updated: "illustrative"
      }
    ],
    provenance: {
      sources: 3,
      observations: 6,
      confidence: 54,
      updated: "awaiting live",
      illustrative: true
    },
    impacts: [
      {
        value: "+6–9%",
        label: "Hull & outfitting material cost pressure (illustrative)",
        explain: {
          what: "Estimated rise in landed steel/plate cost for shipbuilding-grade inputs if European HRC/plate benchmarks hold at current elevated levels — weighted across hull blocks and outfitting categories.",
          formula: "Σ ( category steel spend share × category price change )",
          inputs: [
            {
              k: "Hull plate & blocks — 55% of steel spend × +7%",
              v: "+3.9%",
              source: "ERP + market indices"
            },
            {
              k: "Outfitting / sections — 45% × +8%",
              v: "+3.6%",
              source: "ERP + supplier quotes"
            }
          ],
          result: "Weighted ≈ +6–9% on affected steel categories",
          assumptions: [
            "European HRC/plate benchmarks — not identical to global HRC but directionally linked.",
            "No mitigation (forward-buy, substitution) applied in this gross figure.",
            "Illustrative until MEPS / ERP price feeds are connected."
          ],
          sources: [
            "European steel-market reporting",
            "EU Commission Trade",
            "Internal procurement"
          ],
          confidence: 58,
          updated: "illustrative"
        }
      },
      {
        value: "+2–4 wk",
        label: "Procurement lead-time stretch (plate / sections)",
        explain: {
          what: "Additional weeks to secure shipbuilding-grade plate and sections when European mills tighten allocations — schedule risk before it hits the yard.",
          formula: "baseline lead time + allocation delay (low … high)",
          inputs: [
            {
              k: "Mill allocation delay",
              v: "+1–2 wk",
              source: "Supplier quotes"
            },
            {
              k: "Import / quota processing",
              v: "+1–2 wk",
              source: "EU trade policy context"
            }
          ],
          result: "Low +2 wk … High +4 wk vs baseline",
          assumptions: [
            "Applies to programmes drawing on European or quota-affected supply.",
            "Does not yet model a specific hull — portfolio-level watch."
          ],
          sources: ["Supplier quotations", "EU Commission Trade"],
          confidence: 52,
          updated: "illustrative"
        }
      },
      {
        value: "€8–12M",
        label: "Portfolio margin pressure if sustained (illustrative)",
        explain: {
          what: "Rough annualised euro pressure across active programmes if +6–9% material cost persists on steel-heavy work packages — before commercial recovery or spec change.",
          formula: "affected steel spend × weighted cost increase",
          inputs: [
            {
              k: "Annual steel-heavy procurement (illustrative)",
              v: "€140M",
              source: "ERP spend"
            },
            {
              k: "Weighted cost increase",
              v: "×7% mid-case",
              source: "derived from +6–9% tile"
            }
          ],
          result: "€140M × 7% ≈ €9.8M (range €8–12M)",
          assumptions: [
            "Does not assert Meyer is already paying these prices — exposure pathway only.",
            "Gross figure before mitigations or customer indexation."
          ],
          sources: ["Internal ERP / Procurement", "Market reporting"],
          confidence: 55,
          updated: "illustrative"
        }
      },
      {
        value: "5 of 6",
        label: "Programmes with steel-heavy BOM exposure",
        explain: {
          what: "How many active newbuild programmes carry material steel/plate intensity high enough to feel European price and availability moves.",
          formula: "count( programmes where steel BOM share ≥ threshold )",
          inputs: [
            {
              k: "Active programmes",
              v: "6",
              source: "Programme register"
            },
            {
              k: "Steel-heavy (≥ threshold)",
              v: "5",
              source: "ERP / BOM"
            }
          ],
          result: "5 of 6 programmes exposed to steel cost moves",
          assumptions: [
            "Threshold is illustrative until BOM analytics are live.",
            "Shipbuilding input link — no need for source to name Meyer."
          ],
          sources: ["Programme register", "Internal ERP / BOM"],
          confidence: 72,
          updated: "illustrative"
        }
      }
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
        { id: "src1", name: "EU Commission Trade", lane: 0, level: "src" },
        { id: "src2", name: "Steel market news", lane: 0, level: "src" },
        { id: "src3", name: "Procurement / BOM", lane: 0, level: "src" },
        { id: "f1", name: "HRC / plate prices ↑", lane: 1, level: "high" },
        { id: "f2", name: "Import quota & duty", lane: 1, level: "high" },
        { id: "f3", name: "Availability / lead time", lane: 1, level: "elev" },
        { id: "f4", name: "CBAM carbon cost", lane: 1, level: "elev" },
        {
          id: "r1",
          name: "Steel supply & cost pressure",
          lane: 2,
          level: "elev",
          current: true
        },
        { id: "l1", name: "Budget overrun", lane: 3, level: "elev" },
        { id: "l2", name: "Late delivery", lane: 3, level: "elev" },
        { id: "l3", name: "Material shortage", lane: 3, level: "elev" },
        { id: "i1", name: "Procurement cost → margin", lane: 4, level: "elev" },
        { id: "i2", name: "Schedule pressure", lane: 4, level: "elev" },
        { id: "i3", name: "Supplier quote volatility", lane: 4, level: "elev" }
      ],
      links: [
        ["src1", "f2"],
        ["src1", "f4"],
        ["src2", "f1"],
        ["src2", "f3"],
        ["src3", "f3"],
        ["f1", "r1"],
        ["f2", "r1"],
        ["f3", "r1"],
        ["f4", "r1"],
        ["r1", "l1"],
        ["r1", "l2"],
        ["r1", "l3"],
        ["l1", "i1"],
        ["l2", "i2"],
        ["l3", "i2"],
        ["l1", "i3"]
      ]
    },
    actions: [
      {
        priority: 1,
        title: "Monitor European steel prices & shipbuilding-grade plate availability",
        detail:
          "Track HRC/plate benchmarks, mill allocations and EU quota utilisation weekly; flag programmes with open steel buy windows.",
        effects: [
          { label: "Early procurement risk visibility" },
          { label: "Quote surprise ↓" }
        ]
      },
      {
        priority: 2,
        title: "Forward-buy / index critical plate categories",
        detail:
          "Lock 2–3 quarters of hull plate where spec allows; align commercial indexation clauses with customers.",
        effects: [
          { label: "Cost variance −40%" },
          { label: "Lead-time risk ↓" }
        ]
      },
      {
        priority: 2,
        title: "Qualify alternate EU / EEA mill routes",
        detail:
          "Reduce single-mill dependency; validate CBAM and quota implications on each route.",
        effects: [{ label: "Availability risk −25%" }]
      },
      {
        priority: 3,
        title: "Review BOM substitution & grade optimisation",
        detail:
          "Engineering review of grade/spec options that preserve class requirements with lower exposure to quota-affected imports.",
        effects: [{ label: "Material cost −2–4%" }]
      }
    ],
    aiInsight: {
      html: "European steel price and safeguard signals indicate <b>rising material-cost and availability risk</b> for shipbuilding programmes. Severity <b>Medium–Elevated</b>; trend <b>Increasing</b> while regional supply stays tight. Recommended posture: monitor plate benchmarks, quota utilisation and open buy windows — <b>potential</b> procurement and schedule pressure, not a confirmed programme hit.",
      confidence: 62
    }
  },
  {
    id: "energy-oil-cost-escalation",
    monitoringObjectiveId: "commodity-energy-prices",
    categoryLabel: "Commodity · Energy",
    riskDefinition: "Energy & logistics cost escalation",
    enterpriseCategory: "Supply Chain · Energy",
    level: "elev",
    score: 54,
    accent: "#E97132",
    trend: [46, 48, 50, 52, 51, 53, 54],
    title: "Brent crude above planning budget — energy & logistics cost pressure",
    summary:
      "Awaiting Brent crude feed. When spot exceeds Meyer's planning assumption, this case compares market price to budgeted $/bbl and tracks freight, supplier energy and yard utility exposure.",
    relevanceKeywords: [
      "brent",
      "crude",
      "oil",
      "energy",
      "freight",
      "logistics",
      "barrel",
      "bbl",
      "shipping",
      "fuel",
      "diesel",
      "middle east",
      "hormuz"
    ],
    relevanceCoreKeywords: ["brent", "crude", "oil", "barrel", "bbl", "energy"],
    relevanceAnchorKeywords: [],
    factors: [
      {
        name: "Brent crude spot above Meyer planning budget",
        severity: "high",
        observation: "Compare ICE Brent spot to budgeted $/bbl in connector config.",
        sourceName: "Brent crude spot feed",
        tier: "external",
        when: "awaiting live",
        confidence: 50
      },
      {
        name: "Freight & logistics surcharge risk",
        severity: "elev",
        observation:
          "Elevated oil supports higher sea-freight and inland logistics surcharges on material lanes.",
        sourceName: "Market / freight indices",
        tier: "external",
        when: "awaiting live",
        confidence: 48
      },
      {
        name: "Supplier & yard energy cost pass-through",
        severity: "elev",
        observation:
          "European suppliers and yard utilities may pass through higher energy input costs into quotes.",
        sourceName: "Procurement / utilities",
        tier: "internal",
        when: "illustrative",
        confidence: 46
      }
    ],
    sources: [
      {
        name: "Brent crude spot (ICE)",
        tier: "external",
        evidence: "spot vs budget $/bbl",
        observations: 1,
        updated: "awaiting live"
      }
    ],
    provenance: {
      sources: 1,
      observations: 1,
      confidence: 52,
      illustrative: true,
      updated: "awaiting live"
    },
    impacts: [
      {
        value: "+14%",
        label: "vs Meyer Brent planning assumption (illustrative)",
        explain: {
          what: "How far current Brent exceeds the budgeted $/bbl set in the oil price connector (default $78/bbl planning, spot ~$89).",
          formula: "(spot − budget) / budget",
          inputs: [
            { k: "Brent spot", v: "market feed", source: "Brent connector" },
            { k: "Meyer budget", v: "connector config", source: "Risk manager" }
          ],
          result: "Variance % shown live when feed runs",
          assumptions: [
            "Budget is a planning assumption for energy/logistics — not actual invoiced oil spend.",
            "Brent is a proxy for wider energy and freight pressure."
          ],
          sources: ["Brent crude spot feed"],
          confidence: 60,
          updated: "live"
        }
      },
      {
        value: "€3–6M",
        label: "Portfolio logistics & energy pass-through (illustrative)",
        explain: {
          what: "Rough annualised exposure if elevated Brent persists on freight surcharges and supplier energy clauses.",
          formula: "affected logistics spend × energy pass-through %",
          inputs: [
            { k: "Affected logistics spend", v: "€42M", source: "ERP (illustrative)" },
            { k: "Pass-through", v: "8–14%", source: "derived" }
          ],
          result: "€3–6M range before mitigation",
          assumptions: ["Gross exposure before hedging or indexation."],
          sources: ["Internal procurement", "Brent feed"],
          confidence: 52,
          updated: "illustrative"
        }
      }
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
        { id: "src1", name: "Brent crude feed", lane: 0, level: "src" },
        { id: "src2", name: "Freight indices", lane: 0, level: "src" },
        { id: "f1", name: "Brent > budget", lane: 1, level: "high" },
        { id: "f2", name: "Freight surcharges", lane: 1, level: "elev" },
        { id: "f3", name: "Energy pass-through", lane: 1, level: "elev" },
        {
          id: "r1",
          name: "Energy & logistics cost escalation",
          lane: 2,
          level: "elev",
          current: true
        },
        { id: "l1", name: "Budget overrun", lane: 3, level: "elev" },
        { id: "l2", name: "Late delivery", lane: 3, level: "elev" },
        { id: "i1", name: "Procurement cost", lane: 4, level: "elev" },
        { id: "i2", name: "Margin pressure", lane: 4, level: "elev" }
      ],
      links: [
        ["src1", "f1"],
        ["src1", "f2"],
        ["src2", "f2"],
        ["f1", "r1"],
        ["f2", "r1"],
        ["f3", "r1"],
        ["r1", "l1"],
        ["r1", "l2"],
        ["l1", "i1"],
        ["l1", "i2"]
      ]
    },
    actions: [
      {
        priority: 1,
        title: "Monitor Brent vs budget weekly",
        detail:
          "Track spot against connector budgeted $/bbl; review freight surcharge clauses on open POs.",
        effects: [{ label: "Early cost visibility" }]
      },
      {
        priority: 2,
        title: "Review logistics contracts & fuel surcharges",
        detail: "Renegotiate or cap surcharges on Asia–Europe lanes where possible.",
        effects: [{ label: "Freight variance ↓" }]
      }
    ],
    aiInsight: {
      html: "Connect a <b>Brent crude</b> source and set Meyer's planning budget ($/bbl). When spot exceeds budget by ≥5%, this case is proposed with live evidence.",
      confidence: 55
    }
  },
  {
    id: "yard-weather-disruption",
    monitoringObjectiveId: "weather-natural-hazards",
    categoryLabel: "Weather · Yard operations",
    riskDefinition: "Weather & outdoor work disruption",
    enterpriseCategory: "Operations · Continuity",
    level: "elev",
    score: 42,
    accent: "#0288D1",
    trend: [48, 46, 45, 43, 41, 40, 42],
    title: "Yard weather exposure — wind, precip and outdoor work windows",
    summary:
      "Turku-area weather conditions can interrupt outdoor work, sea trials and logistics. Live Open-Meteo / FMI feeds firm up confidence on wind and precipitation factors even on quiet days; severity rises when gusts or precip cross operational thresholds.",
    relevanceKeywords: [
      "weather",
      "wind",
      "gust",
      "storm",
      "precip",
      "rain",
      "forecast",
      "open-meteo",
      "fmi",
      "temperature",
      "turku",
      "yard"
    ],
    factors: [
      {
        name: "High wind / gusts affecting outdoor work & cranage",
        severity: "high",
        observation:
          "Sustained wind or gusts can pause cranage and exposed hull work.",
        sourceName: "Open-Meteo / FMI",
        tier: "external",
        when: "awaiting live",
        confidence: 48
      },
      {
        name: "Precipitation interrupting outdoor production windows",
        severity: "elev",
        observation:
          "Rain/snow reduces usable outdoor windows for coating and assembly.",
        sourceName: "Open-Meteo / FMI",
        tier: "external",
        when: "awaiting live",
        confidence: 45
      },
      {
        name: "Yard conditions & sea-trial weather window",
        severity: "elev",
        observation:
          "Local temperature, wind and weather codes inform trial and logistics planning.",
        sourceName: "Open-Meteo forecast",
        tier: "external",
        when: "awaiting live",
        confidence: 44
      }
    ],
    sources: [
      {
        name: "Open-Meteo",
        tier: "external",
        evidence: "current + hourly + daily forecast",
        observations: 0,
        updated: "—"
      }
    ],
    provenance: {
      sources: 0,
      observations: 0,
      confidence: 40,
      updated: "—",
      illustrative: true
    },
    impacts: [
      {
        value: "Outdoor",
        label: "Work windows sensitive to wind/precip",
        explain: {
          what: "Outdoor hull, cranage and coating work pause when wind or precipitation crosses yard operating limits — shown here as a qualitative exposure until live thresholds are applied.",
          formula:
            "if gust ≥ yard limit OR precip ≥ outdoor threshold → outdoor window closed",
          inputs: [
            {
              k: "Typical yard gust pause threshold",
              v: "~15 m/s",
              source: "Yard ops playbook"
            },
            {
              k: "Live forecast / observations",
              v: "Open-Meteo / FMI",
              source: "Live weather connectors"
            }
          ],
          result:
            "Exposure flagged when live gusts or precip approach those limits",
          assumptions: [
            "Thresholds are illustrative yard defaults.",
            "Live connectors firm confidence; severity rises only when limits are crossed."
          ],
          sources: ["Open-Meteo", "FMI", "Yard ops playbook"],
          confidence: 72,
          updated: "just now"
        }
      },
      {
        value: "Trials",
        label: "Sea-trial slots weather-dependent",
        explain: {
          what: "Sea-trial windows need acceptable wind and sea state. Forecast risk does not cancel a slot by itself — it raises the chance of slip if conditions deteriorate.",
          formula: "trial slot retained unless forecast breaches trial weather criteria",
          inputs: [
            {
              k: "Upcoming trial slots",
              v: "programme schedule",
              source: "Programme register"
            },
            {
              k: "Forecast wind / precip",
              v: "live feed",
              source: "Open-Meteo"
            }
          ],
          result: "Slots remain; confidence adjusts with live weather evidence",
          assumptions: [
            "Illustrative until trial criteria are loaded per hull.",
            "No automatic reschedule in this demo — decision stays with ops."
          ],
          sources: ["Open-Meteo", "Programme register"],
          confidence: 68,
          updated: "just now"
        }
      },
      {
        value: "Logistics",
        label: "Yard transport & cranage exposure",
        explain: {
          what: "Internal yard moves and cranage are wind-limited. Live gust evidence backs this factor even on quiet days; impact is operational capacity, not a euro figure yet.",
          formula: "cranage / yard transport available when wind < operating limit",
          inputs: [
            {
              k: "Cranage wind limit",
              v: "site SOP",
              source: "Yard ops"
            },
            {
              k: "Current / forecast gusts",
              v: "live",
              source: "Open-Meteo"
            }
          ],
          result: "Capacity risk rises with gust intensity (see live score bump)",
          assumptions: [
            "Euro impact not modelled in this demo tile.",
            "Live weather RawRecords update factor confidence, not this label text."
          ],
          sources: ["Open-Meteo", "Yard ops"],
          confidence: 70,
          updated: "just now"
        }
      }
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
        { id: "src1", name: "Open-Meteo", lane: 0, level: "src" },
        { id: "src2", name: "FMI alerts", lane: 0, level: "src" },
        { id: "f1", name: "High wind / gusts", lane: 1, level: "high" },
        { id: "f2", name: "Precipitation", lane: 1, level: "elev" },
        { id: "f3", name: "Yard conditions", lane: 1, level: "elev" },
        {
          id: "r1",
          name: "Weather & outdoor work disruption",
          lane: 2,
          level: "elev",
          current: true
        },
        { id: "l1", name: "Production interruption", lane: 3, level: "elev" },
        { id: "l2", name: "Sea trial delay", lane: 3, level: "elev" },
        { id: "i1", name: "Schedule pressure", lane: 4, level: "elev" },
        { id: "i2", name: "Outdoor capacity ↓", lane: 4, level: "elev" }
      ],
      links: [
        ["src1", "f1"],
        ["src1", "f2"],
        ["src1", "f3"],
        ["src2", "f1"],
        ["f1", "r1"],
        ["f2", "r1"],
        ["f3", "r1"],
        ["r1", "l1"],
        ["r1", "l2"],
        ["l1", "i1"],
        ["l1", "i2"],
        ["l2", "i1"]
      ]
    },
    actions: [
      {
        priority: 1,
        title: "Protect outdoor-critical work packages this week",
        detail:
          "Resequence coating / cranage into lower-wind windows from the live forecast.",
        effects: [{ label: "Idle outdoor hours ↓" }]
      },
      {
        priority: 2,
        title: "Hold a weather gate before sea-trial confirmation",
        detail: "Confirm wind/sea-state against trial criteria 48h out.",
        effects: [{ label: "Trial abort risk ↓" }]
      }
    ],
    aiInsight: {
      html: "Live weather feeds raise <b>confidence</b> even on quiet days. Severity ticks up when gusts or precipitation cross yard thresholds.",
      confidence: 60
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
