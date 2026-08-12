import { container } from "../config/cosmos.js";
import {
  listRawRecordsForSource,
  findLatestDefinitionForSource
} from "../connectors/connectorLifecycle.service.js";
import { levelForScore } from "../data/riskOverview.js";
import { findMonitoringCapabilityById } from "../data/monitoringCapabilities.js";
import {
  enrichOilRiskCase,
  OIL_CASE_ID
} from "./oilPriceMonitor.service.js";

/** Demo keyword hints → factor themes (light touch until AI enrichment). */
const FACTOR_HINTS = [
  {
    keys: ["export", "licen", "sanction", "embargo", "restrict", "dual-use", "fsf", "anti-dump"],
    factorMatch: /export|licen|sanction/i
  },
  {
    // Require china/tariff/duty context — bare "customs" must not map to China tariff factor.
    keys: ["tariff", "duty", "anti-dump", "china", "chinese", "landed"],
    factorMatch: /tariff|customs|trade|landed|china/i
  },
  {
    keys: ["transport", "shipping", "freight", "transit", "port", "vessel", "asia"],
    factorMatch: /transit|transport|asia/i
  },
  {
    keys: ["currency", "euro", "dollar", "fx", "inflation", "interest"],
    factorMatch: /currency|eur\/usd|fx/i
  },
  {
    keys: ["wind", "gust", "storm", "gale"],
    factorMatch: /wind|gust|storm|gale/i
  },
  {
    keys: ["precip", "rain", "snow", "flood"],
    factorMatch: /precip|rain|flood|outdoor|precipitation/i
  },
  {
    keys: ["temp", "temperature", "frost", "heat", "weather", "wmo", "open-meteo", "forecast"],
    factorMatch: /weather|temp|sea trial|condition|forecast/i
  },
  {
    keys: ["hrc", "hot-rolled", "hot rolled", "coil", "steel price", "plate price", "meps", "benchmark"],
    factorMatch: /hrc|plate|steel.*price|price.*steel|cost/i
  },
  {
    keys: ["quota", "safeguard", "18.3", "out-of-quota", "duty-free", "50%", "import limit"],
    factorMatch: /quota|safeguard|import|duty|regime/i
  },
  {
    keys: ["availability", "lead time", "lead-time", "supply tight", "shortage", "allocation", "mill"],
    factorMatch: /availability|lead|supply|shortage|allocation/i
  },
  {
    keys: ["cbam", "carbon border", "embedded carbon", "carbon cost"],
    factorMatch: /cbam|carbon/i
  },
  {
    keys: ["oil", "brent", "crude", "energy cost", "freight", "shipping disruption"],
    factorMatch: /energy|logistics|freight|oil|shipping/i
  }
];

/**
 * Objective-level defaults when a connector has no Monitoring Profile yet.
 * Business intent for the objective — not China-case-specific.
 */
const OBJECTIVE_PROFILE_DEFAULTS = {
  "geopolitical-regulatory": {
    includeTerms: [
      "sanction",
      "export",
      "tariff",
      "customs",
      "trade",
      "china",
      "regulatory",
      "embargo",
      "duty",
      "dual-use",
      "procurement",
      "geopolit",
      "restriction",
      "anti-dump",
      "wto",
      "imo",
      "maritime",
      "shipping",
      "licen"
    ],
    excludeTerms: [
      "sport",
      "football",
      "hockey",
      "entertainment",
      "recipe",
      "weather forecast",
      "temperature_2m",
      "open-meteo"
    ],
    entities: [],
    locations: []
  },
  "weather-natural-hazards": {
    includeTerms: [
      "weather",
      "wind",
      "gust",
      "storm",
      "precip",
      "rain",
      "forecast",
      "temperature",
      "flood",
      "gale",
      "open-meteo",
      "turku",
      "yard"
    ],
    excludeTerms: ["sanction", "tariff", "china export", "football"],
    entities: [],
    locations: ["turku", "finland", "baltic"]
  },
  "commodity-energy-prices": {
    includeTerms: [
      "steel",
      "hrc",
      "hot-rolled",
      "coil",
      "plate",
      "shipbuilding",
      "hull",
      "procurement",
      "material",
      "commodity",
      "cbam",
      "safeguard",
      "quota",
      "import",
      "duty",
      "price",
      "cost",
      "meps",
      "energy",
      "oil",
      "brent",
      "crude",
      "inflation",
      "carbon border",
      "supply",
      "availability"
    ],
    excludeTerms: [
      "sport",
      "football",
      "entertainment",
      "recipe",
      "sperm donor",
      "moped",
      "school year"
    ],
    entities: [],
    locations: ["europe", "european union", "eu", "finland"]
  }
};

function clean(item) {
  if (!item) return item;
  const { _rid, _self, _etag, _attachments, _ts, ...rest } = item;
  return rest;
}

function normList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || "").trim().toLowerCase())
    .filter(Boolean);
}

function mergeProfiles(...profiles) {
  const merged = {
    includeTerms: [],
    excludeTerms: [],
    entities: [],
    locations: []
  };
  for (const p of profiles) {
    if (!p || typeof p !== "object") continue;
    merged.includeTerms.push(...normList(p.includeTerms));
    merged.excludeTerms.push(...normList(p.excludeTerms));
    merged.entities.push(...normList(p.entities));
    merged.locations.push(...normList(p.locations));
  }
  return {
    includeTerms: [...new Set(merged.includeTerms)],
    excludeTerms: [...new Set(merged.excludeTerms)],
    entities: [...new Set(merged.entities)],
    locations: [...new Set(merged.locations)]
  };
}

function recordHaystack(record) {
  return `${record.title || ""} ${record.summary || ""} ${record.payload?.kind || ""} ${record.metadata?.profileId || ""} ${record.canonicalUrl || ""}`.toLowerCase();
}

/**
 * Monitoring Profile pre-filter (objective / connector business intent).
 * Does not delete RawRecords — only decides whether a record proceeds
 * toward risk-case matching for this enrichment pass.
 */
export function passesMonitoringProfile(record, profile) {
  if (!profile) return true;
  const hay = recordHaystack(record);
  const excludes = normList(profile.excludeTerms);
  if (excludes.some((term) => hay.includes(term))) return false;

  const includes = [
    ...normList(profile.includeTerms),
    ...normList(profile.entities),
    ...normList(profile.locations)
  ];
  if (!includes.length) return true;
  return includes.some((term) => hay.includes(term));
}

async function listActiveSourcesForObjective(monitoringObjectiveId) {
  const { resources } = await container.items
    .query({
      query: `
        SELECT c.id, c.name, c.provider, c.status, c.connectorStatus, c.sourceKind
        FROM c
        WHERE c.objectType = @objectType
          AND ARRAY_CONTAINS(c.monitoringObjectiveIds, @moId)
          AND (c.status = @active OR c.connectorStatus = @active)
      `,
      parameters: [
        { name: "@objectType", value: "informationSource" },
        { name: "@moId", value: monitoringObjectiveId },
        { name: "@active", value: "active" }
      ]
    })
    .fetchAll();
  return (resources || []).map(clean);
}

/**
 * Resolve Monitoring Profile for a source on an objective:
 * connector definition profile ∪ objective defaults.
 */
async function resolveProfileForSource(source, monitoringObjectiveId) {
  const objectiveDefault =
    OBJECTIVE_PROFILE_DEFAULTS[monitoringObjectiveId] || null;
  let definitionProfile = null;
  try {
    const definition = await findLatestDefinitionForSource(source.id);
    definitionProfile =
      definition?.monitoringConfiguration?.monitoringProfile || null;
  } catch {
    // ignore — fall back to objective defaults
  }

  const capability = findMonitoringCapabilityById(monitoringObjectiveId);
  const capabilityHint = capability
    ? {
        includeTerms: (capability.relatedRiskFactors || []).map((f) =>
          String(f).replace(/-/g, " ")
        )
      }
    : null;

  return mergeProfiles(objectiveDefault, capabilityHint, definitionProfile);
}

function snippetOf(record) {
  const text = String(record.summary || record.title || "").replace(/\s+/g, " ").trim();
  if (text.length <= 220) return text;
  return `${text.slice(0, 217)}…`;
}

function matchFactorName(record, factors) {
  const hay = `${record.title || ""} ${record.summary || ""}`.toLowerCase();
  const payloadKind = String(record.payload?.kind || record.metadata?.profileId || "").toLowerCase();
  const blob = `${hay} ${payloadKind}`;
  for (const hint of FACTOR_HINTS) {
    if (!hint.keys.some((k) => blob.includes(k))) continue;
    const factor = (factors || []).find((f) => hint.factorMatch.test(f.name || ""));
    if (factor) return factor.name;
  }
  return null;
}

function caseKeywords(riskCase) {
  const fromCase = Array.isArray(riskCase.relevanceKeywords)
    ? riskCase.relevanceKeywords
    : [];
  return [...new Set(fromCase.map((k) => String(k).toLowerCase().trim()).filter(Boolean))];
}

function caseCoreKeywords(riskCase) {
  const fromCase = Array.isArray(riskCase.relevanceCoreKeywords)
    ? riskCase.relevanceCoreKeywords
    : [];
  return [...new Set(fromCase.map((k) => String(k).toLowerCase().trim()).filter(Boolean))];
}

function caseAnchorKeywords(riskCase) {
  const fromCase = Array.isArray(riskCase.relevanceAnchorKeywords)
    ? riskCase.relevanceAnchorKeywords
    : [];
  return [...new Set(fromCase.map((k) => String(k).toLowerCase().trim()).filter(Boolean))];
}

/**
 * Keep only records thematically relevant to this risk case.
 *
 * - relevanceAnchorKeywords (if set): at least one MUST match (e.g. china).
 * - relevanceKeywords: thematic soft terms; if set with anchors, at least one soft
 *   term must also match (china + tariff/export/…, not china + random visit).
 * - relevanceCoreKeywords: legacy OR-list when anchors are absent.
 * - suggestedFactor alone is never enough without anchors/cores when those exist.
 */
export function belongsToCase(record, riskCase, suggestedFactor) {
  const hay = recordHaystack(record);
  const anchors = caseAnchorKeywords(riskCase);
  const keywords = caseKeywords(riskCase);
  const core = caseCoreKeywords(riskCase);

  if (anchors.length) {
    if (!anchors.some((k) => hay.includes(k))) return false;
    if (keywords.length && !keywords.some((k) => hay.includes(k))) return false;
    return true;
  }

  if (suggestedFactor) {
    if (core.length && !core.some((k) => hay.includes(k))) return false;
    return true;
  }

  if (core.length) {
    if (!core.some((k) => hay.includes(k))) return false;
    if (!keywords.length) return true;
    return keywords.some((k) => hay.includes(k));
  }

  if (!keywords.length) return true;
  return keywords.some((k) => hay.includes(k));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function weatherIntensityBump(signals) {
  let bump = 0;
  for (const sig of signals) {
    const p = sig.payload || {};
    const gust = Number(p.wind_gusts_10m ?? p.current?.wind_gusts_10m);
    const wind = Number(p.wind_speed_10m ?? p.current?.wind_speed_10m);
    const precip = Number(p.precipitation ?? p.precipitation_sum ?? p.current?.precipitation);
    if (Number.isFinite(gust) && gust >= 15) bump += 2;
    if (Number.isFinite(wind) && wind >= 12) bump += 1;
    if (Number.isFinite(precip) && precip >= 2) bump += 1;
  }
  return clamp(bump, 0, 6);
}

/**
 * Collect connector RawRecords for an objective and map to case-relevant signals.
 * Pipeline: RawRecords → Monitoring Profile pre-filter → case relevance filter.
 * RawRecords are never deleted.
 */
export async function collectLiveSignalsForCase(
  riskCase,
  { limitPerSource = 12, maxSignals = 12 } = {}
) {
  const empty = {
    signals: [],
    sources: [],
    scanned: 0,
    droppedByProfile: 0,
    droppedByCase: 0,
    matched: 0
  };
  if (!riskCase?.monitoringObjectiveId) return empty;

  let sources = [];
  try {
    sources = await listActiveSourcesForObjective(riskCase.monitoringObjectiveId);
  } catch (err) {
    console.warn("liveEvidence: could not list sources:", err.message);
    return { ...empty, error: err.message };
  }

  const signals = [];
  let scanned = 0;
  let droppedByProfile = 0;
  let droppedByCase = 0;

  for (const source of sources) {
    let records = [];
    try {
      records = await listRawRecordsForSource(source.id, { limit: limitPerSource });
    } catch (err) {
      console.warn(`liveEvidence: raw records for ${source.id}:`, err.message);
      continue;
    }

    const profile = await resolveProfileForSource(
      source,
      riskCase.monitoringObjectiveId
    );

    for (const record of records) {
      const title = String(record.title || "").trim();
      if (!title) continue;
      scanned += 1;

      if (!passesMonitoringProfile(record, profile)) {
        droppedByProfile += 1;
        continue;
      }

      const suggestedFactor = matchFactorName(record, riskCase.factors);
      if (!belongsToCase(record, riskCase, suggestedFactor)) {
        droppedByCase += 1;
        continue;
      }

      signals.push({
        id: record.id,
        rawRecordId: record.id,
        informationSourceId: source.id,
        sourceName: source.name || record.metadata?.sourceName || "Information source",
        provider: source.provider || "",
        sourceKind: source.sourceKind || record.metadata?.adapterType || "",
        title,
        snippet: snippetOf(record),
        canonicalUrl: record.canonicalUrl || "",
        publishedAt: record.publishedAt || null,
        collectedAt: record.receivedAt || record.createdAt || null,
        suggestedFactor,
        origin: "connector",
        caseRelevant: true,
        profilePassed: true,
        payload: record.payload || null
      });
    }
  }

  signals.sort((a, b) =>
    String(b.collectedAt || "").localeCompare(String(a.collectedAt || ""))
  );

  const trimmed = signals.slice(0, maxSignals);

  return {
    signals: trimmed,
    sources,
    scanned,
    droppedByProfile,
    droppedByCase,
    matched: signals.length,
    // backward-compatible alias
    dropped: droppedByProfile + droppedByCase
  };
}

function buildEmergingFactors(unassignedSignals) {
  if (!unassignedSignals.length) return [];
  const top = unassignedSignals.slice(0, 3);
  const label =
    top.length === 1
      ? `Emerging signal · ${String(top[0].title).slice(0, 60)}`
      : `Emerging live cluster · ${top.length} signals`;
  return [
    {
      name: label,
      severity: "elev",
      observation:
        "New live evidence matched this risk case theme but did not map cleanly to an existing factor. Review and promote into the risk model if it persists.",
      sourceName: top[0].sourceName || "Live sources",
      tier: "external",
      when: "just now",
      confidence: clamp(52 + top.length * 6, 52, 78),
      illustrative: false,
      liveBacked: true,
      emerging: true,
      liveSignalCount: top.length,
      liveSignals: top
    }
  ];
}

/**
 * Apply live signals → factor live-backed flags, confidence ↑, score tick.
 */
export function applyLiveDeltaToCase(riskCase, collected) {
  const baselineScore = Number(riskCase.score) || 0;
  const baselineConfidence = Number(riskCase.provenance?.confidence) || 50;
  const trimmed = collected.signals || [];
  const sources = collected.sources || [];
  const scanned = collected.scanned || 0;
  const droppedByProfile = collected.droppedByProfile || 0;
  const droppedByCase = collected.droppedByCase || 0;
  const matched = collected.matched ?? trimmed.length;
  const dropped = droppedByProfile + droppedByCase;

  const factors = (riskCase.factors || []).map((f) => {
    const matchedSignals = trimmed.filter((s) => s.suggestedFactor === f.name);
    const liveBacked = matchedSignals.length > 0;
    const baseConf = Number(f.confidence) || 50;
    return {
      ...f,
      illustrative: !liveBacked,
      liveBacked,
      liveSignalCount: matchedSignals.length,
      liveSignals: matchedSignals.slice(0, 3),
      confidence: liveBacked
        ? clamp(baseConf + 8 + matchedSignals.length * 4, baseConf, 99)
        : baseConf,
      confidenceBaseline: baseConf
    };
  });

  const unassigned = trimmed.filter((s) => !s.suggestedFactor);
  const emerging = buildEmergingFactors(unassigned);
  const allFactors = [...factors, ...emerging];

  const liveBackedCount = allFactors.filter((f) => f.liveBacked).length;
  const signalCount = trimmed.length;
  const scoreBump = clamp(
    liveBackedCount * 3 + Math.min(6, signalCount) + weatherIntensityBump(trimmed),
    0,
    14
  );
  const confidenceBump = clamp(liveBackedCount * 4 + Math.min(8, signalCount * 2), 0, 18);
  const score = clamp(baselineScore + scoreBump, 0, 99);
  const level = levelForScore(score);

  let note;
  if (trimmed.length > 0) {
    note = `Live evidence updated this case: ${liveBackedCount} factor(s) live-backed, score ${baselineScore}→${score} (confidence ${baselineConfidence}→${clamp(baselineConfidence + confidenceBump, 0, 99)}). Filtered ${dropped} of ${scanned} record(s) (profile ${droppedByProfile}, case theme ${droppedByCase}).`;
  } else if (scanned > 0) {
    note = `Scanned ${scanned} collected record(s) on this objective: ${droppedByProfile} filtered by Monitoring Profile, ${droppedByCase} not matching this case theme, 0 matched. Score stays at baseline ${baselineScore}.`;
  } else {
    note =
      "No RawRecords yet for In-use sources on this objective. Approve a connector sample or run a fetch, then refresh — score and factor confidence will move.";
  }

  const sourceIdsUsed = new Set(trimmed.map((s) => s.informationSourceId));

  return {
    ...riskCase,
    baselineScore,
    score,
    scoreBump,
    level: level.key,
    levelLabel: level.label,
    factors: allFactors,
    provenance: {
      ...(riskCase.provenance || {}),
      confidence: clamp(baselineConfidence + confidenceBump, 0, 99),
      confidenceBaseline: baselineConfidence,
      illustrative: liveBackedCount === 0,
      liveBackedFactors: liveBackedCount,
      liveSignals: signalCount,
      updated: signalCount > 0 ? "just now" : riskCase.provenance?.updated || null
    },
    liveEvidence: {
      signals: trimmed.map(({ payload, ...rest }) => rest),
      sourcesUsed: sources
        .filter((s) => sourceIdsUsed.has(s.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          provider: s.provider || "",
          sourceKind: s.sourceKind || ""
        })),
      collectedFromConnectors: trimmed.length > 0,
      scanned,
      matched,
      dropped,
      droppedByProfile,
      droppedByCase,
      scoreBump,
      confidenceBump,
      liveBackedFactors: liveBackedCount,
      emergingFactors: emerging.length,
      note
    }
  };
}

/**
 * Attach live RawRecords from In-use sources — filtered to this risk case theme.
 * Mutates factor live-backed state, confidence, and case score when evidence exists.
 */
export async function enrichRiskCaseWithLiveEvidence(
  riskCase,
  { limitPerSource = 12, maxSignals = 12 } = {}
) {
  if (!riskCase?.monitoringObjectiveId) {
    return {
      ...riskCase,
      baselineScore: riskCase.score,
      scoreBump: 0,
      liveEvidence: {
        signals: [],
        sourcesUsed: [],
        scanned: 0,
        matched: 0,
        dropped: 0,
        droppedByProfile: 0,
        droppedByCase: 0,
        note: "No monitoring objective linked to this case."
      }
    };
  }

  const collected = await collectLiveSignalsForCase(riskCase, {
    limitPerSource,
    maxSignals
  });

  if (collected.error && !collected.signals.length) {
    return {
      ...riskCase,
      baselineScore: riskCase.score,
      scoreBump: 0,
      liveEvidence: {
        signals: [],
        sourcesUsed: [],
        scanned: 0,
        matched: 0,
        dropped: 0,
        droppedByProfile: 0,
        droppedByCase: 0,
        error: "Could not load information sources for live evidence.",
        note: "Case narrative remains illustrative; live evidence unavailable."
      }
    };
  }

  const baseEnriched = applyLiveDeltaToCase(riskCase, collected);
  if (riskCase.id === OIL_CASE_ID) {
    return enrichOilRiskCase(riskCase, baseEnriched);
  }
  return baseEnriched;
}

/**
 * Lightweight overview bump for an objective with a published case.
 */
export async function livePostureBumpForObjective(monitoringObjectiveId, caseId) {
  if (!caseId) {
    return { scoreBump: 0, confidenceBump: 0, liveBackedFactors: 0, liveSignals: 0 };
  }
  try {
    const { findRiskCaseById } = await import("../data/riskCases.js");
    const riskCase = findRiskCaseById(caseId);
    if (!riskCase) {
      return { scoreBump: 0, confidenceBump: 0, liveBackedFactors: 0, liveSignals: 0 };
    }
    const enriched = await enrichRiskCaseWithLiveEvidence(riskCase, {
      limitPerSource: 8,
      maxSignals: 10
    });
    return {
      scoreBump: enriched.scoreBump || 0,
      confidenceBump: enriched.liveEvidence?.confidenceBump || 0,
      liveBackedFactors: enriched.liveEvidence?.liveBackedFactors || 0,
      liveSignals: enriched.liveEvidence?.signals?.length || 0,
      score: enriched.score,
      baselineScore: enriched.baselineScore
    };
  } catch (err) {
    console.warn("livePostureBumpForObjective:", err.message);
    return { scoreBump: 0, confidenceBump: 0, liveBackedFactors: 0, liveSignals: 0 };
  }
}
