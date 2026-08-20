// =============================================================================
// Offline demo backend — patches window.fetch so the real RDT frontend runs
// with NO server and NO paid AI. Every /api/* call is served from the bundled
// demo data modules plus pre-baked, schema-correct "AI" responses.
//
// Swappable AI: set window.RDT_AI_PROVIDER = async (kind, payload) => {...}
// to route Source Advisor / Connector proposals to a free local model
// (e.g. Ollama) or a free-tier API instead of the baked responses.
// =============================================================================
import {
  monitoringCapabilities,
  findMonitoringCapabilityById,
} from "./data/monitoringCapabilities.js";
import {
  getPostureForObjective,
  buildOverviewSummary,
  listIdentifiedRisks,
  listRisksForObjective,
  levelForScore,
} from "./data/riskOverview.js";
import { findRiskCaseById, riskCases } from "./data/riskCases.js";
import {
  getRiskCaseReview,
  setRiskCaseReview,
  clearRiskCaseReview,
  isRiskCaseDismissed,
  listDismissedForObjective,
} from "./data/riskCaseReviewStore.js";
import { getDemoMockActiveSources } from "./data/demoMockSources.js";

const OIL_CASE_ID = "energy-oil-cost-escalation";
const clampN = (n, a, b) => Math.max(a, Math.min(b, n));
const nowIso = () => new Date().toISOString();
const uuid = () =>
  (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
  "id-" + Math.abs(Date.now() + Math.floor(Math.random() * 1e6)).toString(36);
const humanize = (s) =>
  String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ---------------------------------------------------------------------------
// Case enrichment (illustrative, no live evidence) — ported from
// riskCaseEnrichment.service.js applyLiveDeltaToCase() with an empty signal set.
// ---------------------------------------------------------------------------
function enrichCaseIllustrative(riskCase) {
  const baselineScore = Number(riskCase.score) || 0;
  const baselineConfidence = Number(riskCase.provenance?.confidence) || 50;

  const factors = (riskCase.factors || []).map((f) => ({
    ...f,
    illustrative: true,
    liveBacked: false,
    liveSignalCount: 0,
    liveSignals: [],
    confidence: Number(f.confidence) || 50,
    confidenceBaseline: Number(f.confidence) || 50,
  }));

  const level = levelForScore(baselineScore);
  return {
    ...riskCase,
    baselineScore,
    score: baselineScore,
    scoreBump: 0,
    level: level.key,
    levelLabel: level.label,
    factors,
    provenance: {
      ...(riskCase.provenance || {}),
      confidence: baselineConfidence,
      confidenceBaseline: baselineConfidence,
      illustrative: true,
      liveBackedFactors: 0,
      liveSignals: 0,
      updated: riskCase.provenance?.updated || null,
    },
    liveEvidence: {
      signals: [],
      sourcesUsed: [],
      collectedFromConnectors: false,
      scanned: 0,
      matched: 0,
      dropped: 0,
      droppedByProfile: 0,
      droppedByCase: 0,
      scoreBump: 0,
      confidenceBump: 0,
      liveBackedFactors: 0,
      emergingFactors: 0,
      note:
        "Illustrative demo — figures are representative. In the live platform, approved connector RawRecords raise factor confidence and tick the score.",
    },
  };
}

// ---------------------------------------------------------------------------
// GET /api/risk/overview
// ---------------------------------------------------------------------------
function riskOverview() {
  const objectives = monitoringCapabilities.map((mo) => {
    const posture = getPostureForObjective(mo.id);
    const score = posture.score;
    const level = levelForScore(score);
    return {
      id: mo.id,
      name: mo.name,
      businessQuestion: mo.businessQuestion,
      description: mo.description,
      relatedRiskFactors: mo.relatedRiskFactors || [],
      ...posture,
      baselineScore: posture.score,
      score,
      scoreBump: 0,
      level: level.key,
      levelLabel: level.label,
      liveBackedFactors: 0,
      liveSignals: 0,
      illustrative: true,
    };
  });
  objectives.sort((a, b) => (b.score || 0) - (a.score || 0));
  const summary = buildOverviewSummary(objectives);
  const risks = listIdentifiedRisks();
  return {
    summary,
    objectives,
    risks,
    note:
      "Baseline scores are illustrative. Live connector evidence raises factor confidence and ticks scores when matching RawRecords exist.",
  };
}

// ---------------------------------------------------------------------------
// GET /api/risk/objectives/:id/cases
// ---------------------------------------------------------------------------
function objectiveCases(objectiveId) {
  const objective = findMonitoringCapabilityById(objectiveId);
  if (!objective) return { __status: 404, error: "Monitoring objective not found" };

  const posture = getPostureForObjective(objectiveId);
  const score = posture.score;
  const level = levelForScore(score || 0);

  const seen = new Set();
  const cases = listRisksForObjective(objectiveId)
    .map((r) => {
      const published = r.caseId ? findRiskCaseById(r.caseId) : null;
      const caseScore = r.score;
      const caseLevel = levelForScore(caseScore);
      return {
        id: r.caseId || `prep:${r.name}`,
        riskDefinition: published?.riskDefinition || r.name,
        title: published?.title || r.name,
        summary: published?.summary || null,
        baselineScore: r.score,
        score: published ? published.score : caseScore,
        scoreBump: 0,
        level: caseLevel.key,
        levelLabel: caseLevel.label,
        caseId: r.caseId,
        status: r.caseId ? "published" : "inPreparation",
        hasCase: Boolean(r.caseId),
      };
    })
    .filter((c) => {
      if (!c.caseId) return true;
      if (seen.has(c.caseId)) return false;
      seen.add(c.caseId);
      return true;
    })
    .map((c) => {
      if (!c.hasCase) return c;
      const s = Math.min(99, Number(c.score) || 0);
      const lvl = levelForScore(s);
      return { ...c, score: s, level: lvl.key, levelLabel: lvl.label };
    });

  const withReview = cases.map((c) => {
    const isOil = c.caseId === OIL_CASE_ID || c.id === OIL_CASE_ID;
    const stored = getRiskCaseReview(objectiveId, c.id);
    let reviewStatus;
    if (stored?.decision === "accept") reviewStatus = "accepted";
    else if (stored?.decision === "reject" || stored?.decision === "delete")
      reviewStatus = "dismissed";
    else if (isOil) reviewStatus = "hidden"; // oil monitor not triggered in demo
    else if (c.hasCase) reviewStatus = "accepted";
    else reviewStatus = "suggested";
    const reviewed = getRiskCaseReview(objectiveId, c.id);
    return {
      ...c,
      reviewStatus,
      reviewedAt: reviewed?.reviewedAt || null,
      origin: c.hasCase ? "published" : "aiSuggested",
      originLabel: c.hasCase
        ? "Published case"
        : "AI suggested from monitoring signals",
    };
  });

  const visible = withReview.filter(
    (c) => c.reviewStatus !== "dismissed" && c.reviewStatus !== "hidden"
  );

  return {
    monitoringObjectiveId: objectiveId,
    objective: {
      id: objective.id,
      name: objective.name,
      businessQuestion: objective.businessQuestion,
      description: objective.description,
      ...posture,
      baselineScore: posture.score,
      score,
      scoreBump: 0,
      level: level.key,
      levelLabel: level.label,
      liveBackedFactors: 0,
      liveSignals: 0,
    },
    cases: visible,
    oilMonitor: { triggered: false, reason: "no_oil_source" },
    counts: {
      total: visible.length,
      published: visible.filter((c) => c.hasCase).length,
      inPreparation: visible.filter((c) => !c.hasCase).length,
      suggested: visible.filter((c) => c.reviewStatus === "suggested").length,
      accepted: visible.filter((c) => c.reviewStatus === "accepted").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Information sources — in-memory store
// ---------------------------------------------------------------------------
const sourceStore = new Map(); // id -> source

function defaultBusinessAccess() {
  return {
    accessKnown: "unknown",
    organisationHasSubscription: "unknown",
    internalOwner: "",
    contactDepartment: "",
    providerPortal: "",
    notes: "",
    decisionStatus: "pending",
  };
}

function objectiveInformationSources(objectiveId) {
  const own = [...sourceStore.values()].filter((s) =>
    (s.monitoringObjectiveIds || []).includes(objectiveId)
  );
  const grouped = { active: [], draft: [], disabled: [] };
  for (const s of own) {
    const st = ["active", "draft", "disabled"].includes(s.status) ? s.status : "draft";
    grouped[st].push(s);
  }
  if (grouped.active.length === 0) {
    for (const mock of getDemoMockActiveSources(objectiveId)) grouped.active.push(mock);
  }
  return {
    monitoringObjectiveId: objectiveId,
    sources: grouped,
    counts: {
      active: grouped.active.length,
      draft: grouped.draft.length,
      disabled: grouped.disabled.length,
    },
  };
}

function createSource(body) {
  const now = nowIso();
  const ids = Array.isArray(body.monitoringObjectiveIds) && body.monitoringObjectiveIds.length
    ? body.monitoringObjectiveIds
    : body.monitoringObjectiveId
    ? [body.monitoringObjectiveId]
    : [];
  const src = {
    id: uuid(),
    objectType: "informationSource",
    name: (body.name || "Information source").trim(),
    description: body.description || body.shortReason || "",
    provider: body.provider || "",
    sourceKind: body.sourceKind || "manual",
    sourceRole: body.sourceRole || "external",
    monitoringObjectiveIds: ids,
    informationNeed: body.informationNeed || "",
    availabilityStatus: body.availabilityStatus || "unknown",
    availabilityLabel: body.availabilityLabel || "",
    businessValue: body.businessValue || "",
    shortReason: body.shortReason || "",
    nextSteps: body.nextSteps || [],
    limitations: body.limitations || [],
    origin: body.origin || "manual",
    sourceRecommendationId: body.sourceRecommendationId || null,
    status: body.status || "draft",
    connectorStatus: "notConfigured",
    requiresUserReview: true,
    businessAccess: { ...defaultBusinessAccess(), ...(body.businessAccess || {}) },
    createdAt: now,
    updatedAt: now,
  };
  sourceStore.set(src.id, src);
  return src;
}

function getSource(id) {
  if (sourceStore.has(id)) return sourceStore.get(id);
  // Synthesize a plausible source for demo-mock/active ids so onboarding still works.
  for (const mo of monitoringCapabilities) {
    for (const m of getDemoMockActiveSources(mo.id)) {
      if (m.id === id) {
        sourceStore.set(id, m);
        return m;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Baked AI — Source Advisor
// ---------------------------------------------------------------------------
const PROVIDER_HINTS = {
  rss: "Public RSS",
  restApi: "REST API",
  csv: "File export",
  excel: "File export",
  database: "Internal database",
  manual: "Manual entry",
};

function availabilityForRole(src) {
  if (src.sourceRole === "internal") return ["customerAccessRequired", "Customer system — internal access required"];
  if (src.sourceRole === "historical") return ["uploadRequired", "Historical extract — upload required"];
  if (src.requiresSimulation) return ["customerAccessRequired", "Customer access required"];
  return ["availableNow", "Publicly available now"];
}

function bakedSourceAdvisor(objective) {
  const needs = (objective.relatedRiskFactors || []).slice(0, 6).map((f) => humanize(f));
  const coverageAssessment = needs.map((n) => ({
    informationNeed: n,
    coverage: "missing",
    existingSourceIds: [],
    explanation:
      "No on-platform source is linked to this objective yet — recommended sources below will establish coverage.",
  }));

  const recommendations = (objective.suggestedSources || []).map((src, i) => {
    const [availabilityStatus, availabilityLabel] = availabilityForRole(src);
    const method = src.sourceKind === "rss" ? "RSS feed" : src.sourceKind === "restApi" ? "REST API" : src.sourceKind === "csv" ? "CSV export" : src.sourceKind === "database" ? "Database" : "Connector";
    return {
      id: `rec-${objective.id}-${src.id}`,
      name: src.name,
      provider: PROVIDER_HINTS[src.sourceKind] || "",
      informationNeed: needs[i % Math.max(needs.length, 1)] || objective.name,
      sourceRole: src.sourceRole,
      businessValue:
        "Feeds " +
        (objective.name.toLowerCase()) +
        " with signals that map to the objective's risk factors and drive early warning.",
      shortReason:
        `Recognised ${src.sourceRole} source for this objective; connects via ${method} and maps cleanly to the monitoring profile.`,
      signals: needs.slice(0, 3),
      availabilityStatus,
      availabilityLabel,
      nextSteps:
        availabilityStatus === "availableNow"
          ? ["Accept to onboard", "Let AI propose a connector", "Approve the sample"]
          : ["Confirm internal owner / access", "Provide endpoint or sample", "Let AI propose a connector"],
      limitations:
        src.requiresSimulation || src.sourceRole !== "external"
          ? ["Requires customer system access", "Field mapping to confirm on first sample"]
          : ["Coverage depends on publisher cadence"],
      actions:
        availabilityStatus === "availableNow"
          ? ["accept", "reject", "openProviderPage"]
          : ["accept", "reject", "requestInternalAccess", "useSimulatedData"],
      priority: i + 1,
      recommendationType:
        src.sourceRole === "internal" ? "Customer Specific" : i === 0 ? "Industry Standard" : "Best Practice",
      confidence: clampN(0.9 - i * 0.07, 0.55, 0.95),
      alreadyOnPlatform: false,
      existingSourceId: null,
      existingLifecycle: null,
    };
  });

  return {
    summary:
      `AI reviewed “${objective.name}” against ${needs.length} information needs and the current on-platform inventory. ` +
      `Coverage is largely open; ${recommendations.length} sources are recommended to establish monitoring, prioritised by fit and availability.`,
    coverageAssessment,
    recommendations,
    assumptions: [
      "Customer is a large European (Finland/EU) cruise-shipbuilding programme with global suppliers.",
      "Public sources are preferred first; internal systems are proposed where they add unique coverage.",
    ],
    existingInformationSources: [],
    groundedInDatabase: true,
    existingSourceCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Baked AI — Connector proposal (v2), normalized like the backend does
// ---------------------------------------------------------------------------
function fieldMappingsToObject(fieldMappings) {
  const map = {};
  for (const item of fieldMappings || []) {
    const sf = String(item.sourceField || "").trim();
    const cf = String(item.canonicalField || "").trim();
    if (sf && cf) map[sf] = cf;
  }
  return map;
}
function readinessToLegacy(r) {
  if (r === "ready-for-activation" || r === "ready-for-test") return "ready";
  if (r === "proposal-ready") return "partiallyReady";
  if (r === "test-failed") return "actionRequired";
  return "unknown";
}
function normalizeConnectorAdviceOutput(advice) {
  const technicalConfiguration = {
    ...(advice.technicalConfiguration || {}),
    proposedFieldMapping: fieldMappingsToObject(advice.technicalConfiguration?.fieldMappings),
  };
  delete technicalConfiguration.fieldMappings;
  const connectorReadiness = advice.connectorReadiness || "proposal-ready";
  const canGenerate =
    connectorReadiness === "ready-for-test" || connectorReadiness === "ready-for-activation";
  return {
    ...advice,
    technicalConfiguration,
    readiness: readinessToLegacy(connectorReadiness),
    recommendedApproach: {
      connectionMethod: advice.recommendation?.connectionMethod || "",
      refreshFrequency: technicalConfiguration.pollInterval || "PT6H",
      expectedData: Object.values(technicalConfiguration.proposedFieldMapping || {}),
      rationale: advice.recommendation?.rationale || "",
      authenticationType: technicalConfiguration.authenticationType || "",
      languages: advice.monitoringConfiguration?.languages || [],
    },
    missingInformation: advice.unresolvedTechnicalFacts || [],
    requiredBeforeConnection: advice.decisionsRequiringUserApproval || [],
    estimatedComplexity: canGenerate ? "medium" : "unknown",
    canGenerateConnectorDefinition: canGenerate,
  };
}

function inferKind(source) {
  const k = source.sourceKind;
  if (k && k !== "toBeConfirmed" && k !== "manual") return k;
  const blob = `${source.name || ""} ${source.provider || ""} ${source.availabilityLabel || ""}`.toLowerCase();
  if (/\brss\b|feed|news|bulletin|updates/.test(blob)) return "rss";
  if (/\bapi\b|rest|endpoint|open-?meteo|opensanctions/.test(blob)) return "restApi";
  if (/csv|excel|export|spreadsheet/.test(blob)) return "csv";
  if (/database|erp|sql|order-?book/.test(blob)) return "database";
  return source.sourceRole === "internal" ? "restApi" : "rss";
}

function bakedConnectorProposal(source, objective) {
  const kind = inferKind(source);
  const isRss = kind === "rss";
  const isApi = kind === "restApi" || kind === "api";
  const method = isRss ? "rss" : isApi ? "api" : kind === "csv" || kind === "excel" ? "file" : kind === "database" ? "database" : "api";
  const endpoint = isRss
    ? "https://example.org/" + (source.name || "feed").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + "/rss"
    : isApi
    ? "https://api.example.org/v1/" + (objective?.id || "data")
    : "";
  const includeTerms = (objective?.relatedRiskFactors || []).slice(0, 8).map((f) => f.replace(/-/g, " "));
  const proposal = {
    summary:
      `AI proposes a ${method.toUpperCase()} connector for “${source.name}”. ` +
      `The connector only collects and maps to canonical fields; relevance and risk scoring happen downstream in AI Enrichment.`,
    source: {
      name: source.name || "Information source",
      provider: source.provider || "",
      sourceType: humanize(kind),
    },
    recommendation: {
      connectionMethod: method,
      rationale: isRss
        ? "The source publishes a standard feed; RSS is the lowest-friction, most reliable collection method and needs no credentials."
        : isApi
        ? "A REST endpoint gives structured, queryable access with predictable fields and polling."
        : "A periodic file export is the most practical route for this internal source.",
      alternativeMethods: [
        {
          method: isRss ? "api" : "rss",
          status: "not-recommended",
          reason: "Available but adds credential/setup overhead without extra coverage for this source.",
        },
        { method: "scrape", status: "not-recommended", reason: "Brittle vs. a structured feed; use only if no feed/API exists." },
      ],
    },
    technicalConfiguration: {
      endpoint,
      documentationUrl: "",
      authenticationType: source.sourceRole === "internal" ? "apiKey" : "none",
      pollInterval: "PT6H",
      responseFormat: isRss ? "application/rss+xml" : isApi ? "application/json" : "text/csv",
      fieldMappings: [
        { canonicalField: "title", sourceField: isRss ? "item.title" : "title" },
        { canonicalField: "summary", sourceField: isRss ? "item.description" : "summary" },
        { canonicalField: "publishedAt", sourceField: isRss ? "item.pubDate" : "published_at" },
        { canonicalField: "canonicalUrl", sourceField: isRss ? "item.link" : "url" },
      ],
    },
    monitoringConfiguration: {
      languages: ["en", "fi"],
      geographicScope: ["European Union", "Finland"],
      sensitivity: "balanced",
      riskCategoryMappings: (objective?.relatedRiskDefinitions || []).slice(0, 4),
      monitoringProfile: {
        includeTerms,
        excludeTerms: ["sport", "entertainment", "recipe"],
        entities: [],
        locations: ["europe", "finland"],
      },
    },
    retentionRecommendation: {
      storeFeedMetadata: true,
      storeRawFeedItem: true,
      scrapeFullArticle: isRss,
      reason:
        "Preserve the immutable RawRecord (title, link, published date) as canonical evidence; full-article scrape adds context for enrichment.",
    },
    automatedValidationPlan: [
      "Fetch the endpoint and confirm it returns a valid " + (isRss ? "RSS/Atom feed" : isApi ? "JSON payload" : "file") + ".",
      "Verify the canonical field mapping against the first sample.",
      "Confirm at least one record is retrievable within the poll window.",
    ],
    decisionsRequiringUserApproval:
      source.sourceRole === "internal"
        ? ["Confirm the internal system owner and access method", "Approve credentials handling for the connector"]
        : ["Confirm this is the correct public feed for the objective"],
    unresolvedTechnicalFacts: isRss ? [] : ["Exact endpoint URL to be confirmed on first connect"],
    assumptions: [
      "Publisher cadence is stable enough for a 6-hour poll.",
      "No authentication required for public sources.",
    ],
    confidence: 0.82,
    connectorReadiness: isRss ? "ready-for-test" : "proposal-ready",
  };
  return normalizeConnectorAdviceOutput(proposal);
}

function buildAccessGuidance(source) {
  const available = source.availabilityStatus === "availableNow" || source.sourceRole === "external";
  return {
    readiness: available ? "ready" : "partiallyReady",
    title: available ? "Ready to onboard" : "Confirm access first",
    summary: available
      ? "This source is publicly available. You can let AI propose a connector and approve the first sample."
      : "This source needs internal access confirmed before a live connector can run; you can still generate a proposal.",
    nextActions: available
      ? ["Run AI connector proposal", "Accept specification", "Approve the sample"]
      : ["Confirm internal owner / subscription", "Run AI connector proposal", "Provide endpoint or sample"],
    canProceedToConnector: true,
  };
}

// ---------------------------------------------------------------------------
// Sample RawRecords for connector test / preview
// ---------------------------------------------------------------------------
function sampleRawRecords(source, objective) {
  const base = nowIso();
  const themes = {
    "geopolitical-regulatory": [
      ["EU adopts new dual-use export control update", "Council regulation revises the EU dual-use list, tightening licensing for specified components with defence or maritime application."],
      ["Commission consults on steel safeguard extension", "DG Trade opens consultation on extending safeguard measures on certain steel categories affecting importers."],
      ["IMO MEPC advances 2026 efficiency measures", "IMO committee progresses tightened efficiency and emissions requirements relevant to newbuild design verification."],
      ["Customs authority issues tariff classification notice", "National customs bulletin clarifies classification and duty treatment for imported sub-assemblies."],
    ],
    "commodity-energy-prices": [
      ["European HRC assessment edges higher", "Hot-rolled coil assessments rise on firmer mill offers and restocking; shipbuilding-grade plate tightness noted."],
      ["CBAM reporting guidance updated", "Updated guidance on embedded-carbon reporting for imported steel affects landed cost calculations."],
      ["Brent crude holds above budget assumption", "Brent trades above the planning budget on supply-side tension, feeding freight and energy surcharges."],
      ["Safeguard quota utilisation rising", "Out-of-quota volumes approach limits for key categories, raising duty exposure for late orders."],
    ],
    "weather-natural-hazards": [
      ["Gale warning issued for the Gulf of Finland", "Meteorological service issues a gale warning with gusts affecting outdoor lifts and transport windows."],
      ["Heavy precipitation forecast for Turku region", "Forecast indicates sustained precipitation that may affect outdoor work and logistics at the yard."],
      ["Sea-state advisory for Baltic approaches", "Advisory notes elevated sea state that could shift sea-trial scheduling windows."],
    ],
  };
  const set = themes[objective?.id] || themes["geopolitical-regulatory"];
  return set.map((t, i) => ({
    id: uuid(),
    informationSourceId: source.id,
    title: t[0],
    summary: t[1],
    canonicalUrl: "https://example.org/record/" + (i + 1),
    publishedAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 6).toISOString(),
    receivedAt: base,
    metadata: { sourceName: source.name, adapterType: source.sourceKind || "rss" },
    payload: { kind: source.sourceKind || "rss" },
  }));
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function json(body, status = 200, delay = 140) {
  return { body, status, delay };
}

async function aiProvider(kind, payload, baked) {
  const p = window.RDT_AI_PROVIDER;
  if (typeof p === "function") {
    try {
      const out = await p(kind, payload);
      if (out) return out;
    } catch (e) {
      /* fall through to baked */
    }
  }
  return baked;
}

async function route(method, pathAndQuery, body) {
  const qi = pathAndQuery.indexOf("?");
  const path = qi >= 0 ? pathAndQuery.slice(0, qi) : pathAndQuery;
  const parts = path.split("/").filter(Boolean); // ["api","risk",...]
  const seg = parts.map(decodeURIComponent);
  const m = method.toUpperCase();

  // /api/risk/*
  if (seg[0] === "api" && seg[1] === "risk") {
    if (m === "GET" && seg[2] === "overview") return json(riskOverview());
    if (m === "GET" && seg[2] === "cases" && seg[3] && !seg[4]) {
      const rc = findRiskCaseById(seg[3]);
      if (!rc) return json({ error: "Risk case not found" }, 404);
      if (isRiskCaseDismissed(rc.monitoringObjectiveId, rc.id))
        return json({ error: "Risk case dismissed", dismissed: true }, 404);
      return json(enrichCaseIllustrative(rc));
    }
    if (m === "POST" && seg[2] === "cases" && seg[4] === "review") {
      const rc = findRiskCaseById(seg[3]);
      if (!rc) return json({ error: "Risk case not found" }, 404);
      const decision = String(body?.decision || "").toLowerCase();
      const entry = setRiskCaseReview(rc.monitoringObjectiveId, seg[3], decision);
      return json({
        caseId: seg[3],
        monitoringObjectiveId: rc.monitoringObjectiveId,
        decision: entry.decision,
        reviewStatus: decision === "accept" ? "accepted" : "dismissed",
        reviewedAt: entry.reviewedAt,
      });
    }
    if (m === "POST" && seg[2] === "cases" && seg[4] === "restore") {
      const rc = findRiskCaseById(seg[3]);
      if (rc) clearRiskCaseReview(rc.monitoringObjectiveId, seg[3]);
      return json({ caseId: seg[3], restored: true });
    }
    if (m === "GET" && seg[2] === "objectives" && seg[4] === "cases")
      return json(objectiveCases(seg[3]));
    if (m === "POST" && seg[2] === "objectives" && seg[4] === "cases" && seg[6] === "review") {
      const entry = setRiskCaseReview(seg[3], seg[5], String(body?.decision || "").toLowerCase());
      return json({
        monitoringObjectiveId: seg[3],
        caseListId: seg[5],
        decision: entry.decision,
        reviewStatus: entry.decision === "accept" ? "accepted" : "dismissed",
        reviewedAt: entry.reviewedAt,
      });
    }
    if (m === "POST" && seg[2] === "objectives" && seg[5] === "restore-dismissed") {
      const dismissed = listDismissedForObjective(seg[3]);
      dismissed.forEach((d) => clearRiskCaseReview(seg[3], d.caseListId));
      return json({ monitoringObjectiveId: seg[3], restoredCount: dismissed.length });
    }
    if (m === "GET" && seg[2] === "objectives" && seg[4] === "case") {
      const rc = riskCases.find((c) => c.monitoringObjectiveId === seg[3]);
      if (!rc) return json({ error: "No risk case published" }, 404);
      return json(enrichCaseIllustrative(rc));
    }
  }

  // /api/monitoring-capabilities
  if (seg[0] === "api" && seg[1] === "monitoring-capabilities") {
    if (m === "GET" && !seg[2])
      return json({ count: monitoringCapabilities.length, items: monitoringCapabilities });
    if (m === "GET" && seg[2] && !seg[3]) {
      const c = findMonitoringCapabilityById(seg[2]);
      return c ? json(c) : json({ error: "Monitoring objective not found" }, 404);
    }
    if (m === "GET" && seg[2] && seg[3] === "information-sources")
      return json(objectiveInformationSources(seg[2]));
    if (m === "POST" && seg[2] && seg[3] === "source-recommendations") {
      const objective = findMonitoringCapabilityById(seg[2]);
      if (!objective) return json({ error: "Monitoring objective not found" }, 404);
      const baked = bakedSourceAdvisor(objective);
      const rec = await aiProvider("sourceAdvisor", { objective }, baked);
      return json(
        {
          monitoringObjectiveId: objective.id,
          generatedBy: window.RDT_AI_PROVIDER ? "externalProvider" : "demoBaked",
          generatedAt: nowIso(),
          groundedInDatabase: true,
          existingSourceCount: 0,
          ...rec,
        },
        200,
        1400
      );
    }
  }

  // /api/information-sources
  if (seg[0] === "api" && seg[1] === "information-sources") {
    if (m === "POST" && !seg[2]) {
      const src = createSource(body || {});
      return json(src, 201);
    }
    if (m === "POST" && seg[2] === "from-recommendation") {
      const rec = body?.recommendation || {};
      const objId = body?.monitoringObjectiveId;
      const src = createSource({
        name: rec.name,
        provider: rec.provider,
        informationNeed: rec.informationNeed,
        sourceRole: rec.sourceRole,
        businessValue: rec.businessValue,
        shortReason: rec.shortReason,
        availabilityStatus: rec.availabilityStatus,
        availabilityLabel: rec.availabilityLabel,
        monitoringObjectiveId: objId,
        origin: "aiSourceAdvisor",
        sourceRecommendationId: rec.id,
        sourceKind: "toBeConfirmed",
      });
      return json({ created: true, duplicate: false, item: src }, 201);
    }
    const id = seg[2];
    const sub = seg[3];
    const source = getSource(id);
    if (m === "GET" && id && !sub) {
      return source ? json(source) : json({ error: "Information source not found" }, 404);
    }
    if (m === "PATCH" && sub === "status") {
      if (!source) return json({ error: "Information source not found" }, 404);
      source.status = body?.status || source.status;
      if (source.status === "active") source.connectorStatus = "active";
      source.updatedAt = nowIso();
      return json(source);
    }
    if (m === "PATCH" && sub === "business-access") {
      if (!source) return json({ error: "Information source not found" }, 404);
      source.businessAccess = { ...defaultBusinessAccess(), ...(source.businessAccess || {}), ...(body || {}), updatedAt: nowIso() };
      source.updatedAt = nowIso();
      return json(source);
    }
    if (m === "GET" && sub === "access-guidance") {
      if (!source) return json({ error: "Information source not found" }, 404);
      return json({
        informationSourceId: source.id,
        sourceName: source.name,
        availabilityStatus: source.availabilityStatus,
        businessAccess: { ...defaultBusinessAccess(), ...(source.businessAccess || {}) },
        guidance: buildAccessGuidance(source),
      });
    }
    if (m === "POST" && sub === "connector-advice") {
      if (!source) return json({ error: "Information source not found" }, 404);
      const objective = findMonitoringCapabilityById((source.monitoringObjectiveIds || [])[0]);
      const baked = bakedConnectorProposal(source, objective);
      const advice = await aiProvider("connectorAdvisor", { source, objective }, baked);
      return json(
        {
          informationSourceId: source.id,
          sourceName: source.name,
          monitoringObjectiveId: objective?.id || null,
          generatedBy: window.RDT_AI_PROVIDER ? "externalProvider" : "demoBaked",
          generatedAt: nowIso(),
          accessGuidance: buildAccessGuidance(source),
          connectorAdvice: advice,
        },
        200,
        1600
      );
    }
    if (m === "POST" && sub === "accept-connector-specification") {
      if (!source) return json({ error: "Information source not found" }, 404);
      const objective = findMonitoringCapabilityById((source.monitoringObjectiveIds || [])[0]);
      const records = sampleRawRecords(source, objective);
      source.connectorStatus = "sampleReady";
      source.updatedAt = nowIso();
      const endpoint = body?.proposal?.technicalConfiguration?.endpoint || "https://example.org/feed/rss";
      return json(
        {
          informationSourceId: source.id,
          acceptedAt: nowIso(),
          executable: true,
          adapterType: source.sourceKind === "restApi" ? "api" : "rss",
          definition: { id: uuid(), status: "generated", connectionMethod: source.sourceKind === "restApi" ? "api" : "rss" },
          verification: { endpoint, ok: true },
          test: {
            records,
            testResult: { ok: true, message: `Fetched ${records.length} records from the endpoint.` },
            definition: { id: uuid(), status: "tested" },
          },
        },
        201,
        1500
      );
    }
    if (m === "POST" && sub === "connector" && seg[4] === "test") {
      if (!source) return json({ error: "Information source not found" }, 404);
      const objective = findMonitoringCapabilityById((source.monitoringObjectiveIds || [])[0]);
      const records = sampleRawRecords(source, objective);
      return json(
        {
          informationSourceId: source.id,
          records,
          testResult: { ok: true, message: `Fetched ${records.length} records.` },
          definition: { id: uuid(), status: "tested" },
        },
        200,
        1200
      );
    }
    if (m === "POST" && sub === "approve-sample") {
      if (!source) return json({ error: "Information source not found" }, 404);
      source.status = "active";
      source.connectorStatus = "active";
      source.updatedAt = nowIso();
      return json({ informationSourceId: source.id, approved: true, status: "active", connectorStatus: "active" });
    }
    if (m === "GET" && sub === "raw-records") {
      if (!source) return json({ error: "Information source not found" }, 404);
      const objective = findMonitoringCapabilityById((source.monitoringObjectiveIds || [])[0]);
      const items = sampleRawRecords(source, objective);
      return json({ informationSourceId: source.id, count: items.length, items });
    }
  }

  return json({ error: "Not found (demo mock): " + m + " " + path }, 404);
}

// ---------------------------------------------------------------------------
// Install fetch patch
// ---------------------------------------------------------------------------
export function installMockBackend() {
  if (window.__RDT_MOCK_INSTALLED__) return;
  window.__RDT_MOCK_INSTALLED__ = true;
  const orig = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (input, init = {}) => {
    let url = typeof input === "string" ? input : input && input.url;
    let pathAndQuery = url;
    try {
      const u = new URL(url, window.location.href);
      pathAndQuery = u.pathname + (u.search || "");
    } catch {
      /* keep as-is */
    }
    if (!pathAndQuery || pathAndQuery.indexOf("/api/") === -1) {
      return orig ? orig(input, init) : Promise.reject(new Error("offline"));
    }
    const method =
      (init && init.method) ||
      (typeof input !== "string" && input && input.method) ||
      "GET";
    let body = null;
    try {
      const raw = init && init.body;
      if (raw) body = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      body = null;
    }
    const result = await route(method, pathAndQuery, body);
    const delay = typeof result.delay === "number" ? result.delay : 140;
    await new Promise((r) => setTimeout(r, delay));
    const status = result.status || 200;
    const payload = result.body != null ? result.body : result;
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
}
