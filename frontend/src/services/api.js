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
    let serverMessage = "";
    let verification = null;
    try {
      const body = await res.json();
      serverMessage = body?.message || body?.error || "";
      verification = body?.verification || null;
    } catch {
      // ignore parse failures for error bodies
    }
    const err = new ApiError(serverMessage || `Request failed with status ${res.status}.`, {
      status: res.status,
      kind: "http",
    });
    if (verification) err.verification = verification;
    throw err;
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
 * Executive risk overview — objectives + illustrative posture scores.
 * GET /api/risk/overview
 */
export async function getRiskOverview({ signal } = {}) {
  return request("/api/risk/overview", { signal });
}

/**
 * Demo risk case payload (narrative, factors, network, actions).
 * GET /api/risk/cases/:caseId
 */
export async function getRiskCaseById(caseId, { signal } = {}) {
  return request(`/api/risk/cases/${encodeURIComponent(caseId)}`, { signal });
}

/**
 * Primary risk case for a monitoring objective (if published).
 * GET /api/risk/objectives/:objectiveId/case
 */
export async function getRiskCaseForObjective(objectiveId, { signal } = {}) {
  return request(
    `/api/risk/objectives/${encodeURIComponent(objectiveId)}/case`,
    { signal }
  );
}

/**
 * List risk cases under one monitoring objective.
 * GET /api/risk/objectives/:objectiveId/cases
 */
export async function getRiskCasesForObjective(objectiveId, { signal } = {}) {
  return request(
    `/api/risk/objectives/${encodeURIComponent(objectiveId)}/cases`,
    { signal }
  );
}

/**
 * Accept or reject an AI-suggested risk case for an objective.
 * POST /api/risk/objectives/:objectiveId/cases/:caseListId/review
 */
export async function reviewRiskCaseForObjective(
  objectiveId,
  caseListId,
  decision,
  { signal } = {}
) {
  return request(
    `/api/risk/objectives/${encodeURIComponent(objectiveId)}/cases/${encodeURIComponent(caseListId)}/review`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision })
    }
  );
}

/**
 * Accept, reject, or delete a risk case by case id.
 * POST /api/risk/cases/:caseId/review
 */
export async function reviewRiskCaseById(caseId, decision, { signal } = {}) {
  return request(`/api/risk/cases/${encodeURIComponent(caseId)}/review`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision })
  });
}

/**
 * Restore a dismissed/deleted risk case (demo reset).
 * POST /api/risk/cases/:caseId/restore
 */
export async function restoreRiskCase(caseId, { signal } = {}) {
  return request(`/api/risk/cases/${encodeURIComponent(caseId)}/restore`, {
    method: "POST",
    signal
  });
}

/**
 * Restore all dismissed cases under an objective (demo reset).
 * POST /api/risk/objectives/:objectiveId/cases/restore-dismissed
 */
export async function restoreDismissedRiskCases(objectiveId, { signal } = {}) {
  return request(
    `/api/risk/objectives/${encodeURIComponent(objectiveId)}/cases/restore-dismissed`,
    { method: "POST", signal }
  );
}

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

/**
 * Accept the Connector Proposal as Specification + Definition.
 * For RSS, backend also runs an automated test fetch when possible.
 * POST /api/information-sources/:id/accept-connector-specification
 */
export async function acceptConnectorSpecification(id, proposal, { signal, runTest = true, limit = 15 } = {}) {
  return request(
    `/api/information-sources/${encodeURIComponent(id)}/accept-connector-specification`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal, runTest, limit }),
      signal,
      timeout: AI_TIMEOUT,
    }
  );
}

/**
 * Re-run connector test / fetch for a source.
 * POST /api/information-sources/:id/connector/test
 */
export async function testConnector(id, { signal, limit = 15 } = {}) {
  return request(
    `/api/information-sources/${encodeURIComponent(id)}/connector/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
      signal,
      timeout: 60000,
    }
  );
}

/**
 * Approve collected sample evidence → move source to In use (active).
 * POST /api/information-sources/:id/approve-sample
 */
export async function approveSourceSample(id, { signal } = {}) {
  return request(
    `/api/information-sources/${encodeURIComponent(id)}/approve-sample`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal,
    }
  );
}

/**
 * List canonical Raw Records collected for a source.
 * GET /api/information-sources/:id/raw-records
 */
export async function getSourceRawRecords(id, { signal, limit = 25 } = {}) {
  const raw = await request(
    `/api/information-sources/${encodeURIComponent(id)}/raw-records?limit=${encodeURIComponent(limit)}`,
    { signal }
  );
  return {
    informationSourceId: raw.informationSourceId || id,
    count: raw.count || (raw.items || []).length,
    items: Array.isArray(raw.items) ? raw.items : [],
  };
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
  samplePending: "Sample pending",
  sampleReady: "Sample ready",
  active: "Active",
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
    informationNeed: pick(
      s,
      ["informationNeed", "monitoringFocus", "informationNeedLabel", "need"],
      ""
    ),
    businessAccessStatus: businessAccessStatusOf(s),
    lifecycle,
    lifecycleLabel:
      lifecycle === "active" ? "In use" : lifecycle === "disabled" ? "Disabled" : "Setup in progress",
    demoMock: Boolean(s.demoMock),
    demoMockLabel: pick(s, ["demoMockLabel"], s.demoMock ? "Demo mock connection" : ""),
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

function extractNeeds(coverage, sourceIndex = {}) {
  if (!coverage) return [];
  const arr = Array.isArray(coverage)
    ? coverage
    : coverage.informationNeeds || coverage.needs || coverage.items || coverage.assessment || [];
  return (Array.isArray(arr) ? arr : []).map((n, i) => {
    if (typeof n === "string") return { id: `need-${i}`, name: n, status: "unknown", detail: "", coverage: null, sourceNames: [] };
    const existingIds = Array.isArray(n.existingSourceIds) ? n.existingSourceIds : [];
    const sourceNames = existingIds
      .map((id) => sourceIndex[id] || id)
      .filter(Boolean);
    return {
      id: String(pick(n, ["id", "key"], `need-${i}`)),
      name: pick(n, ["name", "need", "informationNeed", "label", "title"], `Information need ${i + 1}`),
      status: normalizeStatus(pick(n, ["status", "coverage", "level", "state"], "unknown")),
      detail: pick(n, ["detail", "note", "reason", "description", "explanation"], ""),
      existingSourceIds: existingIds,
      sourceNames,
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
    alreadyOnPlatform: Boolean(r.alreadyOnPlatform),
    existingSourceId: r.existingSourceId ? String(r.existingSourceId) : null,
    existingLifecycle: pick(r, ["existingLifecycle"], null),
    existingSourceName: pick(r, ["existingSourceName"], ""),
    existingConnectorStatus: pick(r, ["existingConnectorStatus"], ""),
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
  const base = { summary: "", needs: [], coverageCounts: { strong: 0, partial: 0, missing: 0, unknown: 0 }, recommendations: [], assumptions: [], existingSourceCount: 0 };
  if (!raw || typeof raw !== "object") return base;

  const existing = Array.isArray(raw.existingInformationSources)
    ? raw.existingInformationSources
    : [];
  const sourceIndex = {};
  existing.forEach((s) => {
    if (s?.id) sourceIndex[s.id] = s.name || s.provider || s.id;
  });

  const needs = extractNeeds(pick(raw, ["coverageAssessment", "coverage"], []), sourceIndex);
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
    existingSourceCount:
      typeof raw.existingSourceCount === "number"
        ? raw.existingSourceCount
        : existing.length,
    groundedInDatabase: Boolean(raw.groundedInDatabase),
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
  // Items may be plain strings or objects ({statement, verificationStep, ...}).
  const strings = (value) =>
    (Array.isArray(value) ? value : toList(value))
      .map((x) => (typeof x === "string" ? x : (x && (x.statement || x.step || x.text || x.label || x.reason || x.verificationStep)) || ""))
      .filter(Boolean);
  const from = (keys, fallback = []) => strings(pick(ca, keys, pick(raw, keys, fallback)));
  const obj = (keys) => {
    for (const k of keys) {
      if (ca[k] && typeof ca[k] === "object") return ca[k];
      if (raw[k] && typeof raw[k] === "object") return raw[k];
    }
    return {};
  };
  return {
    informationSourceId: pick(raw, ["informationSourceId", "id"], ""),
    sourceName: pick(raw, ["sourceName", "name"], ""),
    generatedBy: pick(raw, ["generatedBy"], ""),
    generatedAt: pick(raw, ["generatedAt"], ""),
    accessReadiness: pick(raw.accessGuidance || {}, ["readiness"], ""),
    readiness: pick(ca, ["readiness"], "unknown"),
    summary: pick(ca, ["summary"], ""),
    recommendedApproach: {
      purpose: pick(ra, ["purpose", "monitoringPurpose"], pick(ca, ["purpose"], "")),
      connectorType: pick(ra, ["connectorType", "type"], pick(ca, ["connectorType"], "")),
      connectionMethod: pick(ra, ["connectionMethod", "method"], ""),
      authentication: pick(ra, ["authentication", "authenticationType", "authType"], pick(ca, ["authenticationType"], "")),
      authenticationType: pick(ra, ["authenticationType", "authType"], pick(ca, ["authenticationType"], "")),
      refreshFrequency: pick(ra, ["refreshFrequency", "frequency", "pollingFrequency"], ""),
      frequency: pick(ra, ["frequency", "pollingFrequency"], ""),
      languages: toList(pick(ra, ["languages", "language"], pick(ca, ["languages"], []))),
      contentScope: pick(ra, ["contentScope", "scope"], pick(ca, ["contentScope"], "")),
      topics: toList(pick(ra, ["topics", "categories"], pick(ca, ["topics"], []))),
      keywords: toList(pick(ra, ["keywords", "searchTerms"], pick(ca, ["keywords"], []))),
      expectedData: toList(pick(ra, ["expectedData", "dataFields", "fields"], pick(ca, ["expectedData"], []))),
      processingInstructions: toList(pick(ra, ["processingInstructions", "riskProcessing"], pick(ca, ["processingInstructions", "recommendedProcessing"], []))),
      rationale: pick(ra, ["rationale"], pick(ca, ["rationale"], "")),
    },
    purpose: pick(ca, ["purpose"], ""),
    connectorType: pick(ca, ["connectorType"], ""),
    authenticationType: pick(ca, ["authenticationType"], ""),
    languages: toList(pick(ca, ["languages"], [])),
    contentScope: pick(ca, ["contentScope"], ""),
    topics: toList(pick(ca, ["topics"], [])),
    keywords: toList(pick(ca, ["keywords"], [])),
    expectedData: toList(pick(ca, ["expectedData", "dataFields"], [])),
    processingInstructions: toList(pick(ca, ["processingInstructions", "recommendedProcessing"], [])),
    rationale: pick(ca, ["rationale"], ""),
    requiredBeforeConnection: toList(pick(ca, ["requiredBeforeConnection"], [])),
    missingInformation: toList(pick(ca, ["missingInformation"], [])),
    assumptions: toList(pick(ca, ["assumptions"], [])),
    estimatedComplexity: pick(ca, ["estimatedComplexity"], "unknown"),
    canGenerateConnectorDefinition: !!ca.canGenerateConnectorDefinition,
    confidence: typeof conf === "number" ? (conf > 1 ? conf / 100 : conf) : null,

    // ---- Connector Proposal structured model (onboarding v2 schema) ----
    // Read the new schema when the backend provides it; otherwise fall back to
    // the existing recommendedApproach fields so the UI degrades gracefully.
    source: (() => {
      const s = obj(["source"]);
      return {
        name: pick(s, ["name"], pick(raw, ["sourceName", "name"], "")),
        provider: pick(s, ["provider"], ""),
        sourceType: pick(s, ["sourceType", "type"], ""),
      };
    })(),
    recommendation: (() => {
      const rc = obj(["recommendation"]);
      const alts = Array.isArray(rc.alternativeMethods) ? rc.alternativeMethods : [];
      return {
        connectionMethod: pick(rc, ["connectionMethod", "method"], pick(ra, ["connectionMethod", "method"], "")),
        rationale: pick(rc, ["rationale"], pick(ra, ["rationale"], "")),
        alternativeMethods: alts.map((m) => ({
          method: pick(m, ["method"], ""),
          status: pick(m, ["status"], ""),
          reason: pick(m, ["reason"], ""),
        })).filter((m) => m.method),
      };
    })(),
    technicalConfiguration: (() => {
      const tc = obj(["technicalConfiguration"]);
      return {
        endpoint: pick(tc, ["endpoint", "url"], ""),
        documentationUrl: pick(tc, ["documentationUrl", "docsUrl"], ""),
        authenticationType: pick(tc, ["authenticationType", "authType"], pick(ra, ["authentication", "authenticationType"], "")),
        pollInterval: pick(tc, ["pollInterval", "frequency"], pick(ra, ["refreshFrequency", "frequency"], "")),
        responseFormat: pick(tc, ["responseFormat", "format"], ""),
        proposedFieldMapping: tc.proposedFieldMapping && typeof tc.proposedFieldMapping === "object" ? tc.proposedFieldMapping : {},
      };
    })(),
    monitoringConfiguration: (() => {
      const mc = obj(["monitoringConfiguration"]);
      const mp = (mc.monitoringProfile && typeof mc.monitoringProfile === "object") ? mc.monitoringProfile : {};
      return {
        languages: strings(pick(mc, ["languages"], pick(ra, ["languages"], []))),
        geographicScope: strings(pick(mc, ["geographicScope", "geography"], [])),
        sensitivity: pick(mc, ["sensitivity"], ""),
        riskCategoryMappings: strings(pick(mc, ["riskCategoryMappings"], [])),
        monitoringProfile: {
          includeTerms: strings(mp.includeTerms),
          excludeTerms: strings(mp.excludeTerms),
          entities: strings(mp.entities),
          locations: strings(mp.locations),
        },
      };
    })(),
    retentionRecommendation: (() => {
      const rr = obj(["retentionRecommendation"]);
      return {
        storeFeedMetadata: rr.storeFeedMetadata,
        storeRawFeedItem: rr.storeRawFeedItem,
        scrapeFullArticle: rr.scrapeFullArticle,
        reason: pick(rr, ["reason"], ""),
      };
    })(),
    // The three-way classification of uncertainty.
    automatedValidationPlan: from(["automatedValidationPlan"]),
    decisionsRequiringUserApproval: from(["decisionsRequiringUserApproval"]),
    unresolvedTechnicalFacts: from(["unresolvedTechnicalFacts"], strings(pick(ca, ["missingInformation"], []))),
    businessAssumptions: from(["assumptions", "businessAssumptions"]),
    connectorReadiness: (() => {
      const s = String(pick(ca, ["connectorReadiness"], pick(raw, ["connectorReadiness"], "")) || "");
      if (s) return s;
      if (ca.canGenerateConnectorDefinition) return "ready-for-test";
      return (ca.summary || ca.recommendedApproach || raw.recommendation) ? "proposal-ready" : "";
    })(),
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

