// =============================================================================
// Centralized REST layer.
// Every network call the app makes lives here — components never call fetch()
// directly. The existing backend is reached through VITE_API_BASE_URL.
// =============================================================================

import { deriveSourceView, humanizeId, normalizeRole } from "../lib/sources.js";
import { normalizeStatus, priorityRank } from "../lib/advisor.js";

/** Base URL of the existing backend (see .env / .env.example). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/** Longer timeout for AI-backed requests (may take up to ~90s). */
export const AI_TIMEOUT = 90000;

/** Structured error so the UI can distinguish "offline" from "bad response". */
export class ApiError extends Error {
  constructor(message, { status = 0, kind = "http", cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind; // "network" | "http" | "parse" | "timeout"
    this.cause = cause;
  }
  get isNetwork() {
    return this.kind === "network";
  }
  get isTimeout() {
    return this.kind === "timeout";
  }
}

/**
 * Low-level request helper. Handles timeouts, network failures and non-2xx
 * responses uniformly, always throwing an ApiError on failure.
 */
async function request(path, { method = "GET", signal, timeout = 12000, ...rest } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  // Chain an externally-provided signal into our controller.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { Accept: "application/json", ...(rest.headers || {}) },
      signal: controller.signal,
      ...rest,
    });
  } catch (err) {
    clearTimeout(timer);
    if (timedOut) {
      throw new ApiError("The request took too long and was cancelled.", {
        kind: "timeout",
        cause: err,
      });
    }
    // fetch rejects on DNS failure, connection refused, CORS, or abort.
    throw new ApiError(
      "The Risk Digital Twin backend could not be reached.",
      { kind: "network", cause: err }
    );
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new ApiError(`Request failed with status ${res.status}.`, {
      status: res.status,
      kind: "http",
    });
  }

  try {
    return await res.json();
  } catch (err) {
    throw new ApiError("The backend returned a malformed response.", {
      kind: "parse",
      cause: err,
    });
  }
}

// -----------------------------------------------------------------------------
// Endpoints
// -----------------------------------------------------------------------------

/**
 * Load the Monitoring Objectives the user can choose from.
 * GET /api/monitoring-capabilities
 */
export async function getMonitoringObjectives({ signal } = {}) {
  const raw = await request("/api/monitoring-capabilities", { signal });
  const list = extractList(raw);
  return list.map(normalizeObjective).filter(Boolean);
}

/**
 * Load a single Monitoring Objective with its full detail.
 * GET /api/monitoring-capabilities/:id
 */
export async function getMonitoringObjectiveById(id, { signal } = {}) {
  const raw = await request(
    `/api/monitoring-capabilities/${encodeURIComponent(id)}`,
    { signal }
  );
  return normalizeObjectiveDetail(raw);
}

/**
 * Load the Information Sources already attached to one Monitoring Objective,
 * grouped by lifecycle. Source of truth for "Sources in use", "Setup in
 * progress" and "Disabled" — never hardcode these counts.
 * GET /api/monitoring-capabilities/:id/information-sources
 */
export async function getMonitoringObjectiveInformationSources(objectiveId, { signal } = {}) {
  const raw = await request(
    `/api/monitoring-capabilities/${encodeURIComponent(objectiveId)}/information-sources`,
    { signal }
  );
  return normalizeObjectiveSources(raw);
}

/**
 * Create an Information Source manually (no AI involved), attached to an
 * objective and starting life in "Setup in progress" (draft).
 * POST /api/information-sources
 */
export async function addInformationSource(objectiveId, input = {}, { signal } = {}) {
  const body = {
    monitoringObjectiveId: objectiveId,
    name: input.name,
    provider: input.provider || "",
    sourceKind: input.sourceKind || "manual",
    informationNeed: input.informationNeed || "",
    status: "draft",
  };
  const raw = await request("/api/information-sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const item = (raw && (raw.item || raw.source)) || raw || {};
  const normalized = normalizeInformationSource(item, 0);
  return {
    ok: !!(normalized && normalized.id) || !!(raw && raw.created),
    id: normalized ? normalized.id : "",
    item: normalized,
  };
}

/**
 * Ask the AI Source Advisor to assess coverage and recommend information
 * sources for an objective. The response is rendered dynamically.
 * POST /api/monitoring-capabilities/:objectiveId/source-recommendations
 */
export async function getSourceRecommendations(objectiveId, { signal } = {}) {
  const raw = await request(
    `/api/monitoring-capabilities/${encodeURIComponent(objectiveId)}/source-recommendations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal,
      timeout: AI_TIMEOUT,
    }
  );
  return normalizeAdvisor(raw);
}

/**
 * Accept an AI recommendation → persist it as an Information Source.
 * POST /api/information-sources/from-recommendation
 * Both { created:true } and { duplicate:true } are treated as success.
 */
export async function acceptRecommendation(objectiveId, recommendation, { signal } = {}) {
  const body = {
    monitoringObjectiveId: objectiveId,
    recommendation:
      recommendation && recommendation.raw && typeof recommendation.raw === "object"
        ? recommendation.raw
        : buildRecommendationPayload(recommendation),
  };
  const raw = await request("/api/information-sources/from-recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const item = (raw && raw.item) || {};
  const id = String(pick(item, ["id", "_id", "key"], ""));
  return {
    created: !!(raw && raw.created),
    duplicate: !!(raw && raw.duplicate),
    id,
    ok: !!id, // either created or duplicate returns an item id
  };
}

/**
 * Move an Information Source between the existing demo lifecycle states.
 * PATCH /api/information-sources/:id/status
 */
export async function updateInformationSourceStatus(id, status, { signal } = {}) {
  return request(`/api/information-sources/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    signal,
  });
}

/**
 * Save Business Access answers for an Information Source.
 * PATCH /api/information-sources/:id/business-access
 */
export async function updateBusinessAccess(id, payload, { signal } = {}) {
  return request(`/api/information-sources/${encodeURIComponent(id)}/business-access`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    signal,
  });
}

/**
 * Load access guidance (readiness, next actions) for an Information Source.
 * GET /api/information-sources/:id/access-guidance
 */
export async function getAccessGuidance(id, { signal } = {}) {
  const raw = await request(
    `/api/information-sources/${encodeURIComponent(id)}/access-guidance`,
    { signal }
  );
  return normalizeAccessGuidance(raw);
}

/**
 * Ask the AI Connector Advisor for a recommended connection approach.
 * POST /api/information-sources/:id/connector-advice  (may take up to ~90s)
 */
export async function getConnectorAdvice(id, { signal } = {}) {
  const raw = await request(
    `/api/information-sources/${encodeURIComponent(id)}/connector-advice`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal,
      timeout: AI_TIMEOUT,
    }
  );
  return normalizeConnectorAdvice(raw);
}

// -----------------------------------------------------------------------------
// Normalization — keep the UI resilient to reasonable backend shape variations.
// -----------------------------------------------------------------------------

// ---- Objective Information Sources (lifecycle-grouped) ----

const SOURCE_KIND_LABELS = {
  commercialService: "Commercial service",
  publicService: "Public service",
  internalSystem: "Internal system",
  fileUpload: "File upload",
  restApi: "REST API",
  rss: "RSS feed",
  csv: "CSV export",
  excel: "Excel export",
  database: "Database",
  manual: "Manual entry",
};

const CONNECTOR_STATUS_LABELS = {
  notConfigured: "Not configured",
  configured: "Configured",
  connected: "Connected",
  connecting: "Connecting",
  pending: "Pending",
  error: "Connection error",
  disabled: "Disabled",
};

function sourceKindLabel(kind) {
  if (!kind) return "";
  return SOURCE_KIND_LABELS[kind] || humanizeId(kind);
}

function connectorStatusLabel(status) {
  if (!status) return "";
  return CONNECTOR_STATUS_LABELS[status] || humanizeId(status);
}

/** Extract a readable business-access status whether it's a string or object. */
function businessAccessStatusOf(s) {
  const ba = pick(s, ["businessAccessStatus", "businessAccess", "accessStatus", "decisionStatus"], "");
  if (!ba) return "";
  if (typeof ba === "string") return humanizeId(ba);
  const inner = pick(ba, ["decisionStatus", "status", "state"], "");
  return inner ? humanizeId(inner) : "";
}

export function normalizeInformationSource(s, i = 0) {
  if (!s || typeof s !== "object") return null;
  const statusRaw = String(pick(s, ["status", "lifecycleStatus", "state"], "draft")).toLowerCase();
  const lifecycle = statusRaw === "active" ? "active" : statusRaw === "disabled" ? "disabled" : "draft";
  const sourceKind = pick(s, ["sourceKind", "kind", "type"], "");
  const connectorStatus = String(pick(s, ["connectorStatus", "connector", "integrationStatus"], "notConfigured"));
  const availabilityRaw = pick(s, ["availabilityLabel", "availability", "availabilityStatus"], "");
  return {
    id: String(pick(s, ["id", "_id", "key", "slug"], `source-${i}`)),
    name: pick(s, ["name", "title", "label", "source"], "Information source"),
    provider: pick(s, ["provider", "vendor", "publisher", "owner"], ""),
    sourceKind,
    sourceKindLabel: sourceKindLabel(sourceKind),
    connectorStatus,
    connectorStatusLabel: connectorStatusLabel(connectorStatus),
    availability: typeof availabilityRaw === "string" ? availabilityRaw : humanizeId(availabilityRaw),
    informationNeed: pick(s, ["informationNeed", "informationNeedLabel", "need"], ""),
    businessAccessStatus: businessAccessStatusOf(s),
    lifecycle,
    lifecycleLabel:
      lifecycle === "active" ? "In use" : lifecycle === "disabled" ? "Disabled" : "Setup in progress",
    raw: s,
  };
}

/**
 * Shape the /information-sources response into { objectiveId, active, draft,
 * disabled, counts }. Counts come from the backend when present, else derive
 * from the arrays — never invented.
 */
export function normalizeObjectiveSources(raw) {
  const grouped = (raw && raw.sources) || {};
  const mapList = (val) =>
    (Array.isArray(val) ? val : []).map((s, i) => normalizeInformationSource(s, i)).filter(Boolean);
  const active = mapList(grouped.active);
  const draft = mapList(grouped.draft);
  const disabled = mapList(grouped.disabled);
  const rawCounts = (raw && raw.counts) || {};
  const num = (v, fallback) => (typeof v === "number" ? v : fallback);
  return {
    objectiveId: String(pick(raw || {}, ["monitoringObjectiveId", "objectiveId", "id"], "")),
    active,
    draft,
    disabled,
    counts: {
      active: num(rawCounts.active, active.length),
      draft: num(rawCounts.draft, draft.length),
      disabled: num(rawCounts.disabled, disabled.length),
    },
  };
}

function extractList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    for (const key of ["data", "items", "results", "capabilities", "objectives"]) {
      if (Array.isArray(raw[key])) return raw[key];
    }
  }
  return [];
}

const pick = (obj, keys, fallback) => {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
};

const toList = (val) => {
  if (Array.isArray(val))
    return val.map((v) => (typeof v === "string" ? v : pick(v, ["text", "label", "name", "step"], ""))).filter(Boolean);
  if (typeof val === "string") return val.split(/\n|•|;/).map((s) => s.trim()).filter(Boolean);
  return [];
};

function rawSources(objectiveRaw) {
  const val = pick(
    objectiveRaw,
    ["suggestedSources", "sources", "informationSources", "sourceList", "providers"],
    []
  );
  return Array.isArray(val) ? val : [];
}

function normalizeSourceBrief(src) {
  if (src == null) return null;
  if (typeof src === "string") return { name: src, role: "external" };
  const name = pick(src, ["name", "title", "label", "source", "provider"], "Source");
  const role = normalizeRole(
    pick(src, ["sourceRole", "tier", "type", "category", "group", "origin", "role"], "external")
  );
  return { name, role };
}

function groupSourceNames(objectiveRaw) {
  const grouped = { internal: [], external: [], historical: [] };
  rawSources(objectiveRaw).forEach((s) => {
    const n = normalizeSourceBrief(s);
    if (n) grouped[n.role].push(n.name);
  });
  return grouped;
}

function countGrouped(grouped) {
  return grouped.internal.length + grouped.external.length + grouped.historical.length;
}

export function normalizeObjective(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const name = pick(
    raw,
    ["name", "title", "objective", "label", "monitoringObjective"],
    "Monitoring Objective"
  );
  const sources = groupSourceNames(raw);
  const factorsRaw = pick(raw, ["relatedRiskFactors", "riskFactors", "risk_factors", "factors"], []);
  const factors = (Array.isArray(factorsRaw) ? factorsRaw : [])
    .map((f) => (typeof f === "string" ? humanizeId(f) : pick(f, ["name", "label", "title"], null)))
    .filter(Boolean);

  return {
    id: String(pick(raw, ["id", "key", "code", "slug"], `objective-${index}`)),
    name,
    businessQuestion: pick(raw, ["businessQuestion", "business_question", "question"], "What does the organisation want to monitor?"),
    description: pick(raw, ["description", "summary", "subtitle", "detail"], ""),
    factors,
    sources,
    sourceCount: countGrouped(sources),
    iconKey: deriveIconKey(name, pick(raw, ["icon", "iconKey", "glyph"], "")),
  };
}

export function normalizeObjectiveDetail(raw) {
  if (!raw || typeof raw !== "object") return null;
  const base = normalizeObjective(raw);

  const factorsRaw = pick(raw, ["relatedRiskFactors", "riskFactors", "factors"], []);
  const riskFactors = (Array.isArray(factorsRaw) ? factorsRaw : [])
    .map((f) => (typeof f === "string" ? humanizeId(f) : pick(f, ["name", "label"], null)))
    .filter(Boolean);

  const defsRaw = pick(raw, ["relatedRiskDefinitions", "riskDefinitions", "definitions"], []);
  const riskDefinitions = (Array.isArray(defsRaw) ? defsRaw : [])
    .map((d) => (typeof d === "string" ? d : pick(d, ["name", "label", "title"], null)))
    .filter(Boolean);

  const sources = rawSources(raw).map((s, i) =>
    deriveSourceView({
      id: String(pick(s, ["id", "key", "slug"], `source-${i}`)),
      name: pick(s, ["name", "title", "label"], "Source"),
      sourceKind: pick(s, ["sourceKind", "kind", "type"], "manual"),
      role: pick(s, ["sourceRole", "role", "tier"], "external"),
      requiresSimulation: !!pick(s, ["requiresSimulation", "demo", "simulated"], false),
    })
  );

  const grouped = { internal: [], external: [], historical: [] };
  sources.forEach((s) => grouped[s.role].push(s));

  return {
    id: base.id,
    name: base.name,
    businessQuestion: base.businessQuestion,
    description: base.description,
    iconKey: base.iconKey,
    riskFactors,
    riskDefinitions,
    sources,
    grouped,
    sourceCount: sources.length,
    counts: {
      total: sources.length,
      internal: grouped.internal.length,
      external: grouped.external.length,
      historical: grouped.historical.length,
    },
  };
}

// ---- AI Source Advisor normalization ----

function extractNeeds(coverage) {
  if (!coverage) return [];
  const arr = Array.isArray(coverage)
    ? coverage
    : coverage.informationNeeds || coverage.needs || coverage.items || coverage.assessment || [];
  return (Array.isArray(arr) ? arr : []).map((n, i) => {
    if (typeof n === "string") return { id: `need-${i}`, name: n, status: "unknown", detail: "", coverage: null };
    return {
      id: String(pick(n, ["id", "key"], `need-${i}`)),
      name: pick(n, ["name", "need", "informationNeed", "label", "title"], `Information need ${i + 1}`),
      status: normalizeStatus(pick(n, ["status", "coverage", "level", "state"], "unknown")),
      detail: pick(n, ["detail", "note", "reason", "description", "explanation"], ""),
      coverage:
        typeof n.coveragePercent === "number"
          ? n.coveragePercent
          : typeof n.score === "number"
          ? n.score
          : null,
    };
  });
}

function normalizeRecommendation(r, i) {
  const confidenceRaw = pick(r, ["confidence", "confidenceScore"], null);
  const confidence =
    typeof confidenceRaw === "number" ? (confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw) : null;
  const priority = pick(r, ["priority", "priorityLevel"], "medium");
  return {
    id: String(pick(r, ["id", "recommendationId", "key"], `rec-${i}`)),
    priority,
    priorityRank: priorityRank(priority),
    recommendationType: pick(r, ["recommendationType", "type", "kind"], "Recommendation"),
    sourceName: pick(r, ["sourceName", "name", "source", "title"], "Suggested source"),
    provider: pick(r, ["provider", "vendor", "publisher"], ""),
    informationNeed: pick(r, ["informationNeed", "information_need", "need"], ""),
    sourceRole: pick(r, ["sourceRole", "role"], ""),
    shortReason: pick(r, ["shortReason", "reason", "rationale", "summary"], ""),
    businessValue: pick(r, ["businessValue", "value", "impact"], ""),
    // normalized (strong/partial/…) for the advisor chip; raw value kept for the flow
    availabilityStatus: normalizeStatus(pick(r, ["availabilityStatus", "availability"], "unknown")),
    availabilityStatusRaw: pick(r, ["availabilityStatus", "availability"], ""),
    availabilityLabel: pick(r, ["availabilityLabel", "availability"], ""),
    nextSteps: toList(pick(r, ["nextSteps", "next_steps", "steps"], [])),
    limitations: toList(pick(r, ["limitations", "caveats", "risks", "constraints"], [])),
    actions: Array.isArray(r.actions) ? r.actions : [],
    confidence,
    // Preserve the original object so Accept sends the exact backend contract.
    raw: r && typeof r === "object" ? r : null,
  };
}

/** Fallback payload if the original recommendation object is not available. */
function buildRecommendationPayload(rec) {
  if (!rec) return {};
  return {
    id: rec.id,
    name: rec.sourceName,
    provider: rec.provider,
    informationNeed: rec.informationNeed || "",
    sourceRole: rec.sourceRole || "external",
    businessValue: rec.businessValue,
    shortReason: rec.shortReason,
    availabilityStatus: rec.availabilityStatusRaw || rec.availabilityStatus,
    availabilityLabel: rec.availabilityLabel,
    recommendationType: rec.recommendationType,
    priority: rec.priority,
    confidence: rec.confidence,
    nextSteps: rec.nextSteps,
    limitations: rec.limitations,
  };
}

export function normalizeAdvisor(raw) {
  const base = { summary: "", needs: [], coverageCounts: { strong: 0, partial: 0, missing: 0, unknown: 0 }, recommendations: [], assumptions: [] };
  if (!raw || typeof raw !== "object") return base;

  const needs = extractNeeds(pick(raw, ["coverageAssessment", "coverage"], []));
  const coverageCounts = { strong: 0, partial: 0, missing: 0, unknown: 0 };
  needs.forEach((n) => {
    coverageCounts[n.status] = (coverageCounts[n.status] || 0) + 1;
  });

  const recommendations = (Array.isArray(raw.recommendations) ? raw.recommendations : [])
    .map((r, i) => normalizeRecommendation(r, i))
    .sort((a, b) => a.priorityRank - b.priorityRank || (b.confidence || 0) - (a.confidence || 0));

  const assumptions = toList(pick(raw, ["assumptions", "notes"], []));

  return {
    summary: pick(raw, ["summary", "overview", "assessmentSummary"], ""),
    needs,
    coverageCounts,
    recommendations,
    assumptions,
  };
}

// ---- Access guidance / connector advice normalization ----

export function normalizeAccessGuidance(raw) {
  if (!raw || typeof raw !== "object") return null;
  const ba = raw.businessAccess || {};
  const g = raw.guidance || {};
  return {
    informationSourceId: pick(raw, ["informationSourceId", "id"], ""),
    sourceName: pick(raw, ["sourceName", "name"], ""),
    availabilityStatus: pick(raw, ["availabilityStatus"], ""),
    businessAccess: {
      accessKnown: pick(ba, ["accessKnown"], ""),
      organisationHasSubscription: pick(ba, ["organisationHasSubscription"], ""),
      internalOwner: pick(ba, ["internalOwner"], ""),
      contactDepartment: pick(ba, ["contactDepartment"], ""),
      providerPortal: pick(ba, ["providerPortal"], ""),
      notes: pick(ba, ["notes"], ""),
      decisionStatus: pick(ba, ["decisionStatus"], ""),
    },
    guidance: {
      readiness: pick(g, ["readiness"], "unknown"),
      title: pick(g, ["title"], ""),
      summary: pick(g, ["summary"], ""),
      nextActions: toList(pick(g, ["nextActions", "next_actions", "actions"], [])),
      canProceedToConnector: !!g.canProceedToConnector,
    },
  };
}

export function normalizeConnectorAdvice(raw) {
  if (!raw || typeof raw !== "object") return null;
  const ca = raw.connectorAdvice || {};
  const ra = ca.recommendedApproach || {};
  const conf = ca.confidence;
  return {
    informationSourceId: pick(raw, ["informationSourceId", "id"], ""),
    sourceName: pick(raw, ["sourceName", "name"], ""),
    generatedBy: pick(raw, ["generatedBy"], ""),
    generatedAt: pick(raw, ["generatedAt"], ""),
    accessReadiness: pick(raw.accessGuidance || {}, ["readiness"], ""),
    readiness: pick(ca, ["readiness"], "unknown"),
    summary: pick(ca, ["summary"], ""),
    recommendedApproach: {
      connectionMethod: pick(ra, ["connectionMethod"], ""),
      refreshFrequency: pick(ra, ["refreshFrequency"], ""),
      expectedData: toList(pick(ra, ["expectedData"], [])),
      rationale: pick(ra, ["rationale"], ""),
    },
    requiredBeforeConnection: toList(pick(ca, ["requiredBeforeConnection"], [])),
    missingInformation: toList(pick(ca, ["missingInformation"], [])),
    assumptions: toList(pick(ca, ["assumptions"], [])),
    estimatedComplexity: pick(ca, ["estimatedComplexity"], "unknown"),
    canGenerateConnectorDefinition: !!ca.canGenerateConnectorDefinition,
    confidence: typeof conf === "number" ? (conf > 1 ? conf / 100 : conf) : null,
  };
}

function deriveIconKey(name, explicit) {
  const hint = `${explicit} ${name}`.toLowerCase();
  if (hint.includes("geo") || hint.includes("politic") || hint.includes("regulat")) return "geopolitical";
  if (hint.includes("supplier") || hint.includes("vendor") || hint.includes("stability")) return "supplier";
  if (hint.includes("weather") || hint.includes("hazard") || hint.includes("natural")) return "weather";
  if (hint.includes("commod") || hint.includes("energy") || hint.includes("price") || hint.includes("market")) return "commodity";
  return "generic";
}
