// =============================================================================
// Centralized REST layer.
// Every network call the app makes lives here — components never call fetch()
// directly. The existing backend is reached through VITE_API_BASE_URL.
// =============================================================================

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
 * Load the Monitoring Objectives (a.k.a. monitoring capabilities) the user can
 * choose from. Returns a list of normalized objective view-models.
 *
 * GET /api/monitoring-capabilities
 */
export async function getMonitoringObjectives({ signal } = {}) {
  const raw = await request("/api/monitoring-capabilities", { signal });
  const list = extractList(raw);
  return list.map(normalizeObjective).filter(Boolean);
}

// -----------------------------------------------------------------------------
// Normalization — keep the UI resilient to reasonable backend shape variations.
// The screen renders a stable view-model regardless of exact field names.
// -----------------------------------------------------------------------------

/** Accept either a bare array or a wrapped { data | items | results } payload. */
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

/** Map a raw source entry to { name, tier } where tier ∈ internal|external|historical. */
function normalizeSource(src) {
  if (src == null) return null;
  if (typeof src === "string") return { name: src, tier: "external" };
  const name = pick(src, ["name", "title", "label", "source", "provider"], "Source");
  const rawTier = String(
    pick(src, ["tier", "type", "category", "group", "origin"], "external")
  ).toLowerCase();
  let tier = "external";
  if (rawTier.includes("intern")) tier = "internal";
  else if (rawTier.includes("hist") || rawTier.includes("archive")) tier = "historical";
  else if (rawTier.includes("extern")) tier = "external";
  return { name, tier };
}

/** Group a flat source list into the three tiers the card displays. */
function groupSources(objectiveRaw) {
  const grouped = { internal: [], external: [], historical: [] };

  // Case A: already grouped, e.g. { informationSources: { internal:[], ... } }
  const maybeGrouped = pick(
    objectiveRaw,
    ["sources", "informationSources", "information_sources"],
    null
  );
  if (maybeGrouped && !Array.isArray(maybeGrouped) && typeof maybeGrouped === "object") {
    for (const tier of ["internal", "external", "historical"]) {
      const arr = maybeGrouped[tier] || maybeGrouped[tier + "Sources"] || [];
      (Array.isArray(arr) ? arr : []).forEach((s) => {
        const n = normalizeSource(s);
        if (n) grouped[tier].push(n.name);
      });
    }
    return grouped;
  }

  // Case B: flat array with a per-item tier/type.
  const flat = Array.isArray(maybeGrouped)
    ? maybeGrouped
    : pick(objectiveRaw, ["sourceList", "providers"], []);
  (Array.isArray(flat) ? flat : []).forEach((s) => {
    const n = normalizeSource(s);
    if (n) grouped[n.tier].push(n.name);
  });
  return grouped;
}

function countSources(grouped) {
  return grouped.internal.length + grouped.external.length + grouped.historical.length;
}

/** Turn one raw objective into the stable view-model the screen renders. */
export function normalizeObjective(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const name = pick(
    raw,
    ["name", "title", "objective", "label", "monitoringObjective"],
    "Monitoring Objective"
  );
  const sources = groupSources(raw);
  const factorsRaw = pick(raw, ["riskFactors", "risk_factors", "factors"], []);
  const factors = (Array.isArray(factorsRaw) ? factorsRaw : [])
    .map((f) => (typeof f === "string" ? f : pick(f, ["name", "label", "title"], null)))
    .filter(Boolean);

  return {
    id: String(pick(raw, ["id", "key", "code", "slug"], `objective-${index}`)),
    name,
    businessQuestion: pick(
      raw,
      ["businessQuestion", "business_question", "question"],
      "What does the organisation want to monitor?"
    ),
    description: pick(
      raw,
      ["description", "summary", "subtitle", "detail"],
      ""
    ),
    factors,
    sources,
    sourceCount: countSources(sources),
    iconKey: deriveIconKey(name, pick(raw, ["icon", "iconKey", "glyph"], "")),
  };
}

/** Choose a professional icon by keyword — presentation is a frontend concern. */
function deriveIconKey(name, explicit) {
  const hint = `${explicit} ${name}`.toLowerCase();
  if (hint.includes("geo") || hint.includes("politic") || hint.includes("regulat"))
    return "geopolitical";
  if (hint.includes("supplier") || hint.includes("vendor") || hint.includes("stability"))
    return "supplier";
  if (hint.includes("weather") || hint.includes("hazard") || hint.includes("natural"))
    return "weather";
  if (
    hint.includes("commod") ||
    hint.includes("energy") ||
    hint.includes("price") ||
    hint.includes("market")
  )
    return "commodity";
  return "generic";
}
