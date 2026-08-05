/**
 * Generic REST/JSON connector adapter.
 *
 * First demo profile: EU Financial Sanctions via OpenSanctions search API
 * (dataset eu_fsf). Set OPEN_SANCTIONS_API_KEY in backend .env for live calls.
 * Without a key, verification/fetch use a small built-in EU FSF-shaped fixture
 * so Accept → sample → In use still works for demos.
 */

const DEFAULT_TIMEOUT_MS = 25000;

/** Known REST source profiles (config overlays). */
export const REST_PROFILES = {
  "opensanctions-eu-fsf": {
    id: "opensanctions-eu-fsf",
    label: "EU Financial Sanctions (OpenSanctions · eu_fsf)",
    provider: "OpenSanctions / European Union FSF",
    documentationUrl: "https://www.opensanctions.org/datasets/eu_fsf/",
    endpoint: "https://api.opensanctions.org/search/eu_fsf",
    method: "GET",
    authenticationType: "apiKey",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "ApiKey ",
    apiKeyEnv: "OPEN_SANCTIONS_API_KEY",
    query: {
      q: "sanction OR russia OR china OR export",
      limit: "15"
    },
    itemsPath: "results",
    responseFormat: "application/json",
    pollInterval: "PT12H",
    fieldMapping: {
      title: "caption",
      summary: "schema+datasets",
      externalId: "id",
      canonicalUrl: "id→opensanctions"
    }
  }
};

/** Offline / no-key demo entities shaped like OpenSanctions search hits. */
const EU_FSF_DEMO_FIXTURE = [
  {
    id: "eu-fsf-demo-1",
    caption: "Demo entity — dual-use export control listing (illustrative)",
    schema: "LegalEntity",
    datasets: ["eu_fsf"],
    properties: {
      name: ["Illustrative Export-Restricted Entity"],
      country: ["cn"],
      topics: ["sanction", "export.control"]
    },
    first_seen: "2024-01-15",
    last_seen: "2026-08-01"
  },
  {
    id: "eu-fsf-demo-2",
    caption: "Demo person — EU financial sanctions programme (illustrative)",
    schema: "Person",
    datasets: ["eu_fsf"],
    properties: {
      name: ["Illustrative Sanctioned Person"],
      country: ["ru"],
      topics: ["sanction"]
    },
    first_seen: "2022-03-01",
    last_seen: "2026-08-01"
  },
  {
    id: "eu-fsf-demo-3",
    caption: "Demo vessel — trade / transport sanctions exposure (illustrative)",
    schema: "Vessel",
    datasets: ["eu_fsf"],
    properties: {
      name: ["Illustrative Flagged Vessel"],
      topics: ["sanction", "maritime"]
    },
    first_seen: "2023-06-10",
    last_seen: "2026-08-01"
  }
];

function getByPath(obj, path) {
  if (!path) return obj;
  return String(path)
    .split(".")
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export function detectRestProfile(source = {}, endpoint = "") {
  const blob = [
    source.name,
    source.provider,
    source.documentationUrl,
    endpoint,
    source.informationNeed
  ]
    .map((v) => String(v || "").toLowerCase())
    .join(" ");

  if (
    /opensanctions|eu_fsf|financial sanctions|eu sanctions|sanctions list|fsf/i.test(
      blob
    )
  ) {
    return REST_PROFILES["opensanctions-eu-fsf"];
  }
  return null;
}

export function resolveRestConfig(config = {}, source = {}) {
  const profile =
    REST_PROFILES[config.profileId] ||
    detectRestProfile(source, config.endpoint) ||
    null;

  const merged = {
    method: "GET",
    authenticationType: "none",
    headers: {},
    query: {},
    itemsPath: "",
    ...(profile || {}),
    ...config,
    query: { ...(profile?.query || {}), ...(config.query || {}) },
    headers: { ...(profile?.headers || {}), ...(config.headers || {}) }
  };

  if (profile && !config.endpoint) {
    merged.endpoint = profile.endpoint;
  }
  if (profile) {
    merged.profileId = profile.id;
  }

  return merged;
}

function buildUrl(endpoint, query = {}) {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function resolveApiKey(config) {
  if (config.apiKey) return String(config.apiKey).trim();
  const envName = config.apiKeyEnv || "OPEN_SANCTIONS_API_KEY";
  const fromEnv = process.env[envName];
  return fromEnv ? String(fromEnv).trim() : "";
}

function buildHeaders(config) {
  const headers = {
    Accept: "application/json",
    ...(config.headers || {})
  };

  const authType = String(config.authenticationType || "none").toLowerCase();
  if (authType === "apikey" || authType === "api_key" || authType === "api-key") {
    const key = resolveApiKey(config);
    if (key) {
      const headerName = config.apiKeyHeader || "Authorization";
      const prefix =
        config.apiKeyPrefix != null ? config.apiKeyPrefix : "ApiKey ";
      headers[headerName] = `${prefix}${key}`;
    }
  } else if (authType === "bearer") {
    const key = resolveApiKey(config);
    if (key) headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function hasRequiredAuth(config) {
  const authType = String(config.authenticationType || "none").toLowerCase();
  if (authType === "none" || !authType) return true;
  return Boolean(resolveApiKey(config));
}

function mapOpenSanctionsHit(hit) {
  const names = asArray(hit?.properties?.name);
  const caption = hit.caption || names[0] || hit.id || "Sanctioned entity";
  const datasets = asArray(hit.datasets).join(", ");
  const countries = asArray(hit?.properties?.country).join(", ");
  const topics = asArray(hit?.properties?.topics).join(", ");
  const summaryParts = [
    hit.schema ? `Type: ${hit.schema}` : "",
    datasets ? `Datasets: ${datasets}` : "",
    countries ? `Country: ${countries}` : "",
    topics ? `Topics: ${topics}` : "",
    hit.last_seen ? `Last seen: ${hit.last_seen}` : ""
  ].filter(Boolean);

  return {
    externalId: hit.id || caption,
    title: caption,
    summary: summaryParts.join(" · "),
    canonicalUrl: hit.id
      ? `https://www.opensanctions.org/entities/${encodeURIComponent(hit.id)}/`
      : "",
    publishedAt: hit.last_seen || hit.first_seen || null,
    language: "en",
    payload: hit
  };
}

function extractItems(payload, config) {
  const path = config.itemsPath || "results";
  let items = getByPath(payload, path);
  if (!items && Array.isArray(payload)) items = payload;
  if (!items && Array.isArray(payload?.results)) items = payload.results;
  items = asArray(items);

  if (config.profileId === "opensanctions-eu-fsf" || path === "results") {
    return items.map(mapOpenSanctionsHit);
  }

  return items.map((item, index) => {
    if (typeof item === "string") {
      return {
        externalId: `item-${index}`,
        title: item,
        summary: "",
        canonicalUrl: "",
        publishedAt: null,
        language: "",
        payload: { value: item }
      };
    }
    const title =
      item.title ||
      item.name ||
      item.caption ||
      item.label ||
      item.id ||
      `Record ${index + 1}`;
    return {
      externalId: String(item.id || item.externalId || title),
      title: String(title),
      summary: String(
        item.summary || item.description || item.detail || ""
      ).slice(0, 2000),
      canonicalUrl: item.url || item.canonicalUrl || item.link || "",
      publishedAt: item.publishedAt || item.updated || item.date || null,
      language: item.language || "",
      payload: item
    };
  });
}

async function httpGetJson(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { response, text, json };
  } finally {
    clearTimeout(timer);
  }
}

function fixtureResult(config, { limit = 15 } = {}) {
  const items = EU_FSF_DEMO_FIXTURE.slice(0, limit).map(mapOpenSanctionsHit);
  return {
    ok: true,
    mode: "fixture",
    endpoint: config.endpoint || REST_PROFILES["opensanctions-eu-fsf"].endpoint,
    message:
      "Using built-in EU FSF demo fixture (set OPEN_SANCTIONS_API_KEY for live OpenSanctions API).",
    sampleTitles: items.map((i) => i.title),
    items,
    fetchedAt: new Date().toISOString()
  };
}

export const restAdapter = {
  type: "rest",

  async testConnection(config = {}, context = {}) {
    const resolved = resolveRestConfig(config, context.source);
    if (!resolved.endpoint) {
      return {
        ok: false,
        message: "REST connector has no endpoint configured."
      };
    }

    if (!hasRequiredAuth(resolved)) {
      if (resolved.profileId === "opensanctions-eu-fsf") {
        const fix = fixtureResult(resolved, { limit: 5 });
        return {
          ok: true,
          endpoint: fix.endpoint,
          message: fix.message,
          mode: "fixture",
          sampleTitles: fix.sampleTitles
        };
      }
      return {
        ok: false,
        message: `REST API key missing (env ${resolved.apiKeyEnv || "API key"}).`
      };
    }

    const url = buildUrl(resolved.endpoint, resolved.query);
    try {
      const { response, json } = await httpGetJson(url, buildHeaders(resolved));
      if (!response.ok) {
        if (resolved.profileId === "opensanctions-eu-fsf") {
          const fix = fixtureResult(resolved, { limit: 5 });
          return {
            ok: true,
            endpoint: url,
            message: `Live API returned HTTP ${response.status}; ${fix.message}`,
            mode: "fixture",
            sampleTitles: fix.sampleTitles
          };
        }
        return {
          ok: false,
          endpoint: url,
          message: `HTTP ${response.status} from REST endpoint`
        };
      }

      const items = extractItems(json, resolved);
      if (!items.length) {
        return {
          ok: false,
          endpoint: url,
          message: "REST endpoint returned no items for the configured itemsPath."
        };
      }

      return {
        ok: true,
        endpoint: url,
        mode: "live",
        message: `REST OK · ${items.length} items`,
        sampleTitles: items.slice(0, 5).map((i) => i.title)
      };
    } catch (error) {
      if (resolved.profileId === "opensanctions-eu-fsf") {
        const fix = fixtureResult(resolved, { limit: 5 });
        return {
          ok: true,
          endpoint: url,
          message: `Live API unreachable (${error.message}); ${fix.message}`,
          mode: "fixture",
          sampleTitles: fix.sampleTitles
        };
      }
      return {
        ok: false,
        endpoint: url,
        message: error.message || "REST connection failed"
      };
    }
  },

  async fetch(config = {}, opts = {}) {
    const limit = opts.limit == null ? 15 : opts.limit;
    const sourceCtx = opts.source || opts.context?.source || null;
    const resolved = resolveRestConfig(config, sourceCtx);
    const query = {
      ...resolved.query,
      ...(resolved.query?.limit != null ? { limit: String(limit) } : {})
    };

    if (!hasRequiredAuth(resolved) && resolved.profileId === "opensanctions-eu-fsf") {
      const fix = fixtureResult({ ...resolved, query }, { limit });
      return {
        fetchedAt: fix.fetchedAt,
        rawContentType: "application/json",
        endpoint: fix.endpoint,
        mode: "fixture",
        items: fix.items
      };
    }

    const url = buildUrl(resolved.endpoint, query);
    try {
      const { response, json } = await httpGetJson(url, buildHeaders(resolved));
      if (!response.ok) {
        if (resolved.profileId === "opensanctions-eu-fsf") {
          const fix = fixtureResult(resolved, { limit });
          return {
            fetchedAt: fix.fetchedAt,
            rawContentType: "application/json",
            endpoint: url,
            mode: "fixture",
            items: fix.items
          };
        }
        throw new Error(`HTTP ${response.status} from REST endpoint (${url})`);
      }
      const items = extractItems(json, resolved).slice(0, limit);
      return {
        fetchedAt: new Date().toISOString(),
        rawContentType: "application/json",
        endpoint: url,
        mode: "live",
        items
      };
    } catch (error) {
      if (resolved.profileId === "opensanctions-eu-fsf") {
        const fix = fixtureResult(resolved, { limit });
        return {
          fetchedAt: fix.fetchedAt,
          rawContentType: "application/json",
          endpoint: url,
          mode: "fixture",
          items: fix.items
        };
      }
      throw error;
    }
  },

  mapToRawRecords(items, context = {}) {
    const now = new Date().toISOString();
    return (items || []).map((item) => ({
      objectType: "rawRecord",
      informationSourceId: context.informationSourceId,
      connectorDefinitionId: context.connectorDefinitionId,
      connectorExecutionId: context.connectorExecutionId,
      externalId: item.externalId,
      title: item.title || "",
      summary: item.summary || "",
      canonicalUrl: item.canonicalUrl || "",
      publishedAt: item.publishedAt || null,
      language: item.language || "",
      contentType: "application/json",
      processingStatus: "received",
      payload: item.payload || item,
      metadata: {
        adapterType: "rest",
        sourceName: context.sourceName || "",
        profileId: context.profileId || "",
        mode: context.mode || ""
      },
      receivedAt: now,
      createdAt: now
    }));
  }
};

export function fallbackRestEndpoints(source = {}) {
  const profile = detectRestProfile(source);
  if (!profile) return [];
  return [buildUrl(profile.endpoint, profile.query)];
}
