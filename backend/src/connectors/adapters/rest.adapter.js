/**
 * Generic REST/JSON connector adapter.
 *
 * Profiles (OpenSanctions, Open-Meteo, …) are convenience overlays. Unknown
 * GET JSON APIs can still onboard when the proposal includes a concrete HTTPS
 * endpoint: the adapter heuristically finds an item list (or wraps a single
 * object snapshot) and maps common title/url fields.
 *
 * Limits: no POST bodies, OAuth flows, XML/WFS, GraphQL, or pagination yet.
 * OpenSanctions still falls back to a fixture when OPEN_SANCTIONS_API_KEY is unset.
 */

const DEFAULT_TIMEOUT_MS = 25000;

/** Common JSON list keys used by public APIs. */
const LIST_PATH_CANDIDATES = [
  "results",
  "features",
  "data",
  "items",
  "records",
  "entries",
  "hits",
  "value"
];

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
    mapStrategy: "opensanctions",
    responseFormat: "application/json",
    pollInterval: "PT12H",
    accessNote:
      "Requires OPEN_SANCTIONS_API_KEY (trial/free public-interest keys at opensanctions.org). Without a key the platform uses a demo fixture."
  },
  "open-meteo-forecast": {
    id: "open-meteo-forecast",
    label: "Open-Meteo weather forecast (Turku yard)",
    provider: "Open-Meteo",
    documentationUrl: "https://open-meteo.com/en/docs",
    endpoint: "https://api.open-meteo.com/v1/forecast",
    method: "GET",
    authenticationType: "none",
    query: {
      latitude: "60.45",
      longitude: "22.27",
      current:
        "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,weather_code",
      hourly:
        "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,weather_code",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
      forecast_days: "3",
      timezone: "Europe/Helsinki"
    },
    itemsPath: "hourly",
    mapStrategy: "open-meteo-forecast",
    responseFormat: "application/json",
    pollInterval: "PT1H",
    accessNote:
      "Open access JSON API — no API key required for non-commercial use (CC BY 4.0). Sample stores current + hourly + daily forecast rows."
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
    /open-?meteo|openmeteo/i.test(blob) ||
    /api\.open-meteo\.com/i.test(blob)
  ) {
    return REST_PROFILES["open-meteo-forecast"];
  }

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
    mapStrategy: "",
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
    if (!config.mapStrategy && profile.mapStrategy) {
      merged.mapStrategy = profile.mapStrategy;
    }
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
  const envName = config.apiKeyEnv;
  if (!envName) return "";
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
      if (config.apiKeyQueryParam) {
        // Query-param keys are applied in buildUrl via resolved query merge at call sites.
      } else {
        const headerName = config.apiKeyHeader || "Authorization";
        const prefix =
          config.apiKeyPrefix != null ? config.apiKeyPrefix : "ApiKey ";
        headers[headerName] = `${prefix}${key}`;
      }
    }
  } else if (authType === "bearer") {
    const key = resolveApiKey(config);
    if (key) headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function withApiKeyQuery(query, config) {
  const authType = String(config.authenticationType || "none").toLowerCase();
  if (
    !(authType === "apikey" || authType === "api_key" || authType === "api-key")
  ) {
    return query;
  }
  const param = config.apiKeyQueryParam;
  if (!param) return query;
  const key = resolveApiKey(config);
  if (!key) return query;
  return { ...query, [param]: key };
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

function openMeteoPlace(payload) {
  const lat = payload?.latitude;
  const lon = payload?.longitude;
  if (lat == null || lon == null) return "configured location";
  return `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`;
}

function openMeteoCanonicalUrl(payload, config = {}) {
  try {
    const endpoint =
      config.endpoint || REST_PROFILES["open-meteo-forecast"].endpoint;
    const query = {
      ...(REST_PROFILES["open-meteo-forecast"].query || {}),
      ...(config.query || {})
    };
    if (payload?.latitude != null) query.latitude = String(payload.latitude);
    if (payload?.longitude != null) query.longitude = String(payload.longitude);
    return buildUrl(endpoint, query);
  } catch {
    return "https://open-meteo.com/en/docs";
  }
}

function formatOpenMeteoMetric(value, unit, label) {
  if (value == null || value === "") return null;
  return `${label} ${value}${unit || ""}`;
}

/** Map Open-Meteo forecast JSON into current + hourly + daily RawRecord rows. */
function mapOpenMeteoForecast(payload, config = {}) {
  const place = openMeteoPlace(payload);
  const canonicalUrl = openMeteoCanonicalUrl(payload, config);
  const lat = payload?.latitude;
  const lon = payload?.longitude;
  const items = [];

  const current = payload?.current;
  const currentUnits = payload?.current_units || {};
  if (isPlainObject(current)) {
    const parts = [
      formatOpenMeteoMetric(
        current.temperature_2m,
        currentUnits.temperature_2m || "°C",
        "Temp"
      ),
      formatOpenMeteoMetric(
        current.wind_speed_10m,
        currentUnits.wind_speed_10m || " km/h",
        "Wind"
      ),
      formatOpenMeteoMetric(
        current.wind_gusts_10m,
        currentUnits.wind_gusts_10m || " km/h",
        "Gusts"
      ),
      formatOpenMeteoMetric(
        current.precipitation,
        currentUnits.precipitation || " mm",
        "Precip"
      ),
      current.weather_code != null ? `WMO code ${current.weather_code}` : null
    ].filter(Boolean);
    const when = current.time || new Date().toISOString();
    items.push({
      externalId: `open-meteo-current-${when}`,
      title: `Current conditions · wind ${current.wind_speed_10m ?? "—"} · gusts ${current.wind_gusts_10m ?? "—"} · ${place}`,
      summary: parts.join(" · ") || "Current weather snapshot",
      canonicalUrl,
      publishedAt: when,
      language: "en",
      payload: {
        kind: "current",
        latitude: lat,
        longitude: lon,
        timezone: payload?.timezone,
        current,
        current_units: currentUnits
      }
    });
  }

  const hourly = payload?.hourly;
  const hourlyUnits = payload?.hourly_units || {};
  const daily = payload?.daily;
  const dailyUnits = payload?.daily_units || {};
  const dailyTimes = asArray(daily?.time);
  for (let i = 0; i < dailyTimes.length; i++) {
    const day = dailyTimes[i];
    const tmax = daily.temperature_2m_max?.[i];
    const tmin = daily.temperature_2m_min?.[i];
    const precip = daily.precipitation_sum?.[i];
    const wind = daily.wind_speed_10m_max?.[i];
    const code = daily.weather_code?.[i];
    const parts = [
      formatOpenMeteoMetric(tmax, dailyUnits.temperature_2m_max || "°C", "Max"),
      formatOpenMeteoMetric(tmin, dailyUnits.temperature_2m_min || "°C", "Min"),
      formatOpenMeteoMetric(
        precip,
        dailyUnits.precipitation_sum || " mm",
        "Precip"
      ),
      formatOpenMeteoMetric(
        wind,
        dailyUnits.wind_speed_10m_max || " km/h",
        "Wind max"
      ),
      code != null ? `WMO code ${code}` : null
    ].filter(Boolean);
    items.push({
      externalId: `open-meteo-daily-${day}`,
      title: `Daily forecast · wind max ${wind ?? "—"} · precip ${precip ?? "—"} · ${day}`,
      summary: `${place} · ${parts.join(" · ")}`,
      canonicalUrl,
      publishedAt: `${day}T12:00:00`,
      language: "en",
      payload: {
        kind: "daily",
        latitude: lat,
        longitude: lon,
        date: day,
        temperature_2m_max: tmax,
        temperature_2m_min: tmin,
        precipitation_sum: precip,
        wind_speed_10m_max: wind,
        weather_code: code,
        units: dailyUnits
      }
    });
  }

  const hourlyTimes = asArray(hourly?.time);
  const maxHourly = 24;
  for (let i = 0; i < Math.min(hourlyTimes.length, maxHourly); i++) {
    const when = hourlyTimes[i];
    const temp = hourly.temperature_2m?.[i];
    const wind = hourly.wind_speed_10m?.[i];
    const gusts = hourly.wind_gusts_10m?.[i];
    const precip = hourly.precipitation?.[i];
    const code = hourly.weather_code?.[i];
    const parts = [
      formatOpenMeteoMetric(temp, hourlyUnits.temperature_2m || "°C", "Temp"),
      formatOpenMeteoMetric(wind, hourlyUnits.wind_speed_10m || " km/h", "Wind"),
      formatOpenMeteoMetric(
        gusts,
        hourlyUnits.wind_gusts_10m || " km/h",
        "Gusts"
      ),
      formatOpenMeteoMetric(
        precip,
        hourlyUnits.precipitation || " mm",
        "Precip"
      ),
      code != null ? `WMO code ${code}` : null
    ].filter(Boolean);
    items.push({
      externalId: `open-meteo-hourly-${when}`,
      title: `Hourly forecast · wind ${wind ?? "—"} · gusts ${gusts ?? "—"} · ${when}`,
      summary: `${place} · ${parts.join(" · ")}`,
      canonicalUrl,
      publishedAt: when,
      language: "en",
      payload: {
        kind: "hourly",
        latitude: lat,
        longitude: lon,
        time: when,
        temperature_2m: temp,
        wind_speed_10m: wind,
        wind_gusts_10m: gusts,
        precipitation: precip,
        weather_code: code,
        units: hourlyUnits
      }
    });
  }

  return items;
}

function mapGenericItem(item, index, rootPayload) {
  if (typeof item === "string" || typeof item === "number") {
    return {
      externalId: `item-${index}`,
      title: String(item),
      summary: "",
      canonicalUrl: "",
      publishedAt: null,
      language: "",
      payload: { value: item }
    };
  }

  if (!isPlainObject(item)) {
    return {
      externalId: `item-${index}`,
      title: `Record ${index + 1}`,
      summary: "",
      canonicalUrl: "",
      publishedAt: null,
      language: "",
      payload: { value: item }
    };
  }

  const props = item.properties && isPlainObject(item.properties) ? item.properties : null;
  const title =
    item.title ||
    item.name ||
    item.caption ||
    item.label ||
    item.headline ||
    item.place ||
    item.id ||
    (Array.isArray(props?.name) ? props.name[0] : props?.name) ||
    `Record ${index + 1}`;

  const summary = String(
    item.summary ||
      item.description ||
      item.detail ||
      item.properties?.description ||
      ""
  ).slice(0, 2000);

  const canonicalUrl =
    item.url ||
    item.canonicalUrl ||
    item.link ||
    item.uri ||
    item.href ||
    "";

  return {
    externalId: String(item.id || item.externalId || item.code || title),
    title: String(title),
    summary,
    canonicalUrl: String(canonicalUrl || ""),
    publishedAt:
      item.publishedAt ||
      item.updated ||
      item.updatedAt ||
      item.time ||
      item.date ||
      item.properties?.time ||
      null,
    language: item.language || "",
    payload: rootPayload && item === rootPayload ? item : item
  };
}

/**
 * Pull a list of row-like objects from arbitrary JSON.
 * Prefer explicit itemsPath, then common list keys, then first object array,
 * then wrap a single object as one record.
 */
function locateRawItems(payload, config = {}) {
  if (payload == null) return [];

  if (config.itemsPath) {
    const atPath = getByPath(payload, config.itemsPath);
    if (Array.isArray(atPath)) return atPath;
    if (isPlainObject(atPath)) return [atPath];
  }

  if (Array.isArray(payload)) return payload;

  if (!isPlainObject(payload)) return [];

  for (const key of LIST_PATH_CANDIDATES) {
    if (Array.isArray(payload[key]) && payload[key].length) {
      return payload[key];
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (
      Array.isArray(value) &&
      value.length &&
      value.every((v) => isPlainObject(v) || typeof v === "string")
    ) {
      if (["bbox", "coordinates"].includes(key)) continue;
      return value;
    }
  }

  // Snapshot-style APIs (forecast current, rates, status): one logical record.
  return [payload];
}

function extractItems(payload, config = {}) {
  const strategy = config.mapStrategy || "";

  if (strategy === "opensanctions" || config.profileId === "opensanctions-eu-fsf") {
    return locateRawItems(payload, { ...config, itemsPath: config.itemsPath || "results" }).map(
      mapOpenSanctionsHit
    );
  }

  if (
    strategy === "open-meteo-forecast" ||
    strategy === "open-meteo-current" ||
    config.profileId === "open-meteo-forecast"
  ) {
    return mapOpenMeteoForecast(payload, config);
  }

  const rawItems = locateRawItems(payload, config);
  return rawItems.map((item, index) => mapGenericItem(item, index, payload));
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
        message:
          "REST connector has no endpoint configured. Include a concrete HTTPS API URL in the proposal, or use a known profile (Open-Meteo, OpenSanctions EU FSF)."
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
          sampleTitles: fix.sampleTitles,
          accessNote: REST_PROFILES["opensanctions-eu-fsf"].accessNote
        };
      }
      return {
        ok: false,
        message: `REST API key missing (env ${resolved.apiKeyEnv || "API key"}).`,
        accessNote: resolved.accessNote || null
      };
    }

    const query = withApiKeyQuery(resolved.query, resolved);
    const url = buildUrl(resolved.endpoint, query);
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

      if (json == null) {
        return {
          ok: false,
          endpoint: url,
          message: "REST endpoint did not return JSON."
        };
      }

      const items = extractItems(json, resolved);
      if (!items.length) {
        return {
          ok: false,
          endpoint: url,
          message:
            "REST endpoint returned JSON but no list/snapshot items could be mapped. Set itemsPath in the proposal or add a profile."
        };
      }

      return {
        ok: true,
        endpoint: url,
        mode: "live",
        message: `REST OK · ${items.length} item(s)${
          resolved.profileId ? ` · profile ${resolved.profileId}` : " · generic JSON"
        }`,
        sampleTitles: items.slice(0, 5).map((i) => i.title),
        accessNote: resolved.accessNote || null
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
    const query = withApiKeyQuery(
      {
        ...resolved.query,
        ...(resolved.query?.limit != null ? { limit: String(limit) } : {})
      },
      resolved
    );

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
      if (json == null) {
        throw new Error(`REST endpoint did not return JSON (${url})`);
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
