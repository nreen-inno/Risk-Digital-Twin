import { container } from "../config/cosmos.js";
import { listRawRecordsForSource } from "../connectors/connectorLifecycle.service.js";

/** Demo keyword hints → factor themes (light touch until AI enrichment). */
const FACTOR_HINTS = [
  {
    keys: ["export", "licen", "sanction", "embargo", "restrict", "dual-use", "fsf"],
    factorMatch: /export|licen|sanction/i
  },
  {
    keys: ["tariff", "duty", "customs", "trade", "china"],
    factorMatch: /tariff|customs|trade|landed|china/i
  },
  {
    keys: ["transport", "shipping", "freight", "transit", "port", "vessel", "asia"],
    factorMatch: /transit|transport|asia/i
  },
  {
    keys: ["currency", "euro", "dollar", "fx", "inflation", "interest"],
    factorMatch: /currency|eur\/usd|fx/i
  }
];

function clean(item) {
  if (!item) return item;
  const { _rid, _self, _etag, _attachments, _ts, ...rest } = item;
  return rest;
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

function snippetOf(record) {
  const text = String(record.summary || record.title || "").replace(/\s+/g, " ").trim();
  if (text.length <= 220) return text;
  return `${text.slice(0, 217)}…`;
}

function matchFactorName(record, factors) {
  const hay = `${record.title || ""} ${record.summary || ""}`.toLowerCase();
  for (const hint of FACTOR_HINTS) {
    if (!hint.keys.some((k) => hay.includes(k))) continue;
    const factor = (factors || []).find((f) => hint.factorMatch.test(f.name || ""));
    if (factor) return factor.name;
  }
  return null;
}

function caseKeywords(riskCase) {
  const fromCase = Array.isArray(riskCase.relevanceKeywords)
    ? riskCase.relevanceKeywords
    : [];
  const fromFactors = (riskCase.factors || []).flatMap((f) =>
    String(f.name || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3)
  );
  const fromTitle = String(riskCase.title || riskCase.riskDefinition || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  return [...new Set([...fromCase, ...fromFactors, ...fromTitle].map((k) => k.toLowerCase()))];
}

/** Keep only records that are thematically relevant to this risk case. */
function belongsToCase(record, riskCase, suggestedFactor) {
  if (suggestedFactor) return true;
  const keywords = caseKeywords(riskCase);
  if (!keywords.length) return true;
  const hay = `${record.title || ""} ${record.summary || ""}`.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

/**
 * Attach live RawRecords from In-use sources — filtered to this risk case theme.
 */
export async function enrichRiskCaseWithLiveEvidence(
  riskCase,
  { limitPerSource = 12, maxSignals = 12 } = {}
) {
  if (!riskCase?.monitoringObjectiveId) {
    return {
      ...riskCase,
      liveEvidence: {
        signals: [],
        sourcesUsed: [],
        note: "No monitoring objective linked to this case."
      }
    };
  }

  let sources = [];
  try {
    sources = await listActiveSourcesForObjective(riskCase.monitoringObjectiveId);
  } catch (err) {
    console.warn("liveEvidence: could not list sources:", err.message);
    return {
      ...riskCase,
      liveEvidence: {
        signals: [],
        sourcesUsed: [],
        error: "Could not load information sources for live evidence.",
        note: "Case narrative remains illustrative; live evidence unavailable."
      }
    };
  }

  const signals = [];
  let scanned = 0;
  let dropped = 0;

  for (const source of sources) {
    let records = [];
    try {
      records = await listRawRecordsForSource(source.id, { limit: limitPerSource });
    } catch (err) {
      console.warn(`liveEvidence: raw records for ${source.id}:`, err.message);
      continue;
    }

    for (const record of records) {
      const title = String(record.title || "").trim();
      if (!title) continue;
      scanned += 1;
      const suggestedFactor = matchFactorName(record, riskCase.factors);
      if (!belongsToCase(record, riskCase, suggestedFactor)) {
        dropped += 1;
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
        caseRelevant: true
      });
    }
  }

  signals.sort((a, b) =>
    String(b.collectedAt || "").localeCompare(String(a.collectedAt || ""))
  );

  const trimmed = signals.slice(0, maxSignals);
  const sourceIdsUsed = new Set(trimmed.map((s) => s.informationSourceId));

  const factors = (riskCase.factors || []).map((f) => {
    const matched = trimmed.filter((s) => s.suggestedFactor === f.name);
    return {
      ...f,
      illustrative: true,
      liveSignalCount: matched.length,
      liveSignals: matched.slice(0, 3)
    };
  });

  let note;
  if (trimmed.length > 0) {
    note = `Showing ${trimmed.length} signal(s) relevant to this risk case (${riskCase.riskDefinition || riskCase.title}). Unrelated items from the same sources were filtered out${dropped ? ` (${dropped} skipped)` : ""}.`;
  } else if (scanned > 0) {
    note = `Found ${scanned} collected record(s) on this objective, but none matched this case theme (${riskCase.riskDefinition || "this risk"}). Add a sanctions/trade/export source or wait for matching headlines.`;
  } else {
    note =
      "No RawRecords yet for In-use sources on this objective. Approve a connector sample or run a fetch, then refresh.";
  }

  return {
    ...riskCase,
    factors,
    liveEvidence: {
      signals: trimmed,
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
      dropped,
      note
    }
  };
}
