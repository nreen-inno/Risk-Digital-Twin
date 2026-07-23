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

/** Structured error so the UI can distinguish "offline" from "bad response". */
export class ApiError extends Error {
  constructor(message, { status = 0, kind = "http", cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind; // "network" | "http" | "parse"
    this.cause = cause;
  }
  get isNetwork() {
    return this.kind === "network";
  }
}

/**
 * Low-level request helper. Handles timeouts, network failures and non-2xx
 * responses uniformly, always throwing an ApiError on failure.
 */
async function request(path, { method = "GET", signal, timeout = 12000, ...rest } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

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
    // fetch rejects on DNS failure, connection refused, CORS, or abort/timeout.
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
      timeout: 90000
    }
  );
  return normalizeAdvisor(raw);
}

// -----------------------------------------------------------------------------
// Normalization — keep the UI resilient to reasonable backend shape variations.
// -----------------------------------------------------------------------------

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
    shortReason: pick(r, ["shortReason", "reason", "rationale", "summary"], ""),
    businessValue: pick(r, ["businessValue", "value", "impact"], ""),
    availabilityStatus: normalizeStatus(pick(r, ["availabilityStatus", "availability"], "unknown")),
    availabilityLabel: pick(r, ["availabilityLabel", "availability"], ""),
    nextSteps: toList(pick(r, ["nextSteps", "next_steps", "steps"], [])),
    limitations: toList(pick(r, ["limitations", "caveats", "risks", "constraints"], [])),
    actions: Array.isArray(r.actions) ? r.actions : [],
    confidence,
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

function deriveIconKey(name, explicit) {
  const hint = `${explicit} ${name}`.toLowerCase();
  if (hint.includes("geo") || hint.includes("politic") || hint.includes("regulat")) return "geopolitical";
  if (hint.includes("supplier") || hint.includes("vendor") || hint.includes("stability")) return "supplier";
  if (hint.includes("weather") || hint.includes("hazard") || hint.includes("natural")) return "weather";
  if (hint.includes("commod") || hint.includes("energy") || hint.includes("price") || hint.includes("market")) return "commodity";
  return "generic";
}
