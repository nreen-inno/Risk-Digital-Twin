/**
 * Generic HTML list-page scrape adapter.
 *
 * Profiles customise list extraction per source (WCO newsroom first).
 * Without a profile, config can still supply linkHrefIncludes /
 * linkClassIncludes so later sources can onboard without new code —
 * though a named profile is preferred for reliability.
 *
 * Scope: public GET HTML list pages → titles, links, dates.
 * Not yet: JS-rendered SPAs, login walls, full-article body scrape.
 */

const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; RiskDigitalTwinConnector/0.1)";

/** Known HTML list-page profiles. */
export const SCRAPE_PROFILES = {
  "wco-newsroom": {
    id: "wco-newsroom",
    label: "WCO Newsroom",
    provider: "World Customs Organization",
    documentationUrl: "https://www.wcoomd.org/en/media/newsroom.aspx",
    endpoint: "https://www.wcoomd.org/en/media/newsroom.aspx",
    authenticationType: "none",
    responseFormat: "text/html",
    pollInterval: "PT12H",
    extractStrategy: "wco-newsroom",
    linkHrefIncludes: ["/en/media/newsroom/"],
    linkClassIncludes: ["headline"],
    accessNote:
      "Public HTML newsroom — no API/RSS required. List page scrape of headline links."
  }
};

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#8211;/gi, "–")
    .replace(/&#8212;/gi, "—")
    .replace(/&#8220;/gi, "“")
    .replace(/&#8221;/gi, "”")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLooseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return raw;
}

function sourceBlob(source = {}, endpoint = "") {
  return `${source.name || ""} ${source.provider || ""} ${source.documentationUrl || ""} ${endpoint}`.toLowerCase();
}

/**
 * Detect a known scrape profile from source identity / endpoint.
 */
export function detectScrapeProfile(source = {}, endpoint = "") {
  const blob = sourceBlob(source, endpoint);
  if (/wco|wcoomd|world customs/.test(blob)) {
    return SCRAPE_PROFILES["wco-newsroom"];
  }
  const ep = String(endpoint || "").toLowerCase();
  for (const profile of Object.values(SCRAPE_PROFILES)) {
    if (ep && profile.endpoint && ep.includes(new URL(profile.endpoint).hostname)) {
      return profile;
    }
  }
  return null;
}

export function fallbackScrapeEndpoints(source = {}) {
  const profile = detectScrapeProfile(source);
  return profile?.endpoint ? [profile.endpoint] : [];
}

/**
 * Merge proposal/config with optional profile defaults.
 */
export function resolveScrapeConfig(config = {}, source = {}) {
  const profile =
    (config.profileId && SCRAPE_PROFILES[config.profileId]) ||
    detectScrapeProfile(source, config.endpoint || config.documentationUrl);

  const endpoint =
    String(config.endpoint || "").trim() ||
    profile?.endpoint ||
    "";

  return {
    ...config,
    profileId: profile?.id || config.profileId || null,
    endpoint,
    resolvedEndpoint: endpoint,
    documentationUrl:
      config.documentationUrl || profile?.documentationUrl || "",
    authenticationType:
      config.authenticationType || profile?.authenticationType || "none",
    responseFormat:
      config.responseFormat || profile?.responseFormat || "text/html",
    pollInterval: config.pollInterval || profile?.pollInterval || "PT12H",
    extractStrategy:
      config.extractStrategy || profile?.extractStrategy || "generic-list",
    linkHrefIncludes:
      config.linkHrefIncludes || profile?.linkHrefIncludes || [],
    linkClassIncludes:
      config.linkClassIncludes || profile?.linkClassIncludes || [],
    maxItems: Number(config.maxItems) > 0 ? Number(config.maxItems) : 25
  };
}

function absoluteUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function hrefMatchesIncludes(href, includes) {
  if (!includes?.length) return true;
  const value = String(href || "").toLowerCase();
  return includes.some((part) => value.includes(String(part).toLowerCase()));
}

function classMatchesIncludes(classAttr, includes) {
  if (!includes?.length) return true;
  const value = String(classAttr || "").toLowerCase();
  return includes.some((part) => value.includes(String(part).toLowerCase()));
}

/**
 * WCO newsroom: date block + h3 > a.headline
 */
function extractWcoNewsroom(html, baseUrl, limit) {
  const items = [];
  const seen = new Set();
  const blockRegex =
    /<p[^>]*class=["'][^"']*news-date[^"']*["'][^>]*>\s*([\s\S]*?)\s*<\/p>[\s\S]{0,400}?<a\s+href=(["'])([^"']+)\2[^>]*class=(["'])([^"']*\bheadline\b[^"']*)\4[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = blockRegex.exec(html)) && items.length < limit) {
    const publishedRaw = stripHtml(match[1]);
    const href = match[3];
    const title = stripHtml(match[6]);
    const canonicalUrl = absoluteUrl(href, baseUrl);
    if (!canonicalUrl || !title || seen.has(canonicalUrl)) continue;
    // Skip year/month index pages (no slug after month).
    if (!/\/newsroom\/\d{4}\/[a-z]+\/[^/]+\.aspx$/i.test(canonicalUrl)) continue;
    seen.add(canonicalUrl);
    items.push({
      externalId: canonicalUrl,
      title,
      summary: "",
      canonicalUrl,
      publishedAt: parseLooseDate(publishedRaw),
      language: "en",
      payload: {
        title,
        link: canonicalUrl,
        published: publishedRaw,
        sourcePage: baseUrl
      }
    });
  }

  if (items.length > 0) return items;

  // Fallback: headline links only.
  return extractGenericList(html, baseUrl, {
    linkHrefIncludes: ["/en/media/newsroom/"],
    linkClassIncludes: ["headline"],
    maxItems: limit
  });
}

/**
 * Generic: scan <a href> tags filtered by href/class includes.
 */
function extractGenericList(html, baseUrl, config) {
  const items = [];
  const seen = new Set();
  const limit = config.maxItems || 25;
  const anchorRegex =
    /<a\s+([^>]*?)href=(["'])([^"']+)\2([^>]*)>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = anchorRegex.exec(html)) && items.length < limit * 3) {
    const before = match[1] || "";
    const after = match[4] || "";
    const href = match[3];
    const inner = match[5];
    const classAttr =
      `${before} ${after}`.match(/class=(["'])([^"']*)\1/i)?.[2] || "";

    if (!hrefMatchesIncludes(href, config.linkHrefIncludes)) continue;
    if (!classMatchesIncludes(classAttr, config.linkClassIncludes)) continue;

    const canonicalUrl = absoluteUrl(href, baseUrl);
    const title = stripHtml(inner);
    if (!canonicalUrl || !title || title.length < 8) continue;
    if (seen.has(canonicalUrl)) continue;
    // Skip pure section indexes when path looks like .../2026.aspx or .../july.aspx
    if (/\/\d{4}(?:\/[a-z]+)?\.aspx$/i.test(canonicalUrl)) continue;

    seen.add(canonicalUrl);
    items.push({
      externalId: canonicalUrl,
      title,
      summary: "",
      canonicalUrl,
      publishedAt: "",
      language: "",
      payload: {
        title,
        link: canonicalUrl,
        sourcePage: baseUrl
      }
    });
    if (items.length >= limit) break;
  }

  return items;
}

function extractItems(html, config) {
  const baseUrl = config.endpoint;
  const limit = config.maxItems || 25;
  const strategy = String(config.extractStrategy || "generic-list");

  if (strategy === "wco-newsroom") {
    return extractWcoNewsroom(html, baseUrl, limit);
  }

  return extractGenericList(html, baseUrl, config);
}

async function fetchHtml(endpoint) {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*",
      "User-Agent": DEFAULT_USER_AGENT
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    contentType: String(response.headers.get("content-type") || "").toLowerCase(),
    text
  };
}

export const scrapeAdapter = {
  type: "scrape",

  resolveConfig(config = {}, source = {}) {
    return resolveScrapeConfig(config, source);
  },

  async validateConfiguration(config = {}, source = {}) {
    const resolved = resolveScrapeConfig(config, source);
    const errors = [];
    if (!resolved.endpoint) {
      errors.push(
        "endpoint is required (HTML list page URL, e.g. WCO newsroom)"
      );
    } else {
      try {
        const url = new URL(resolved.endpoint);
        if (!/^https?:$/.test(url.protocol)) {
          errors.push("endpoint must be http(s)");
        }
      } catch {
        errors.push("endpoint is not a valid URL");
      }
    }
    return { ok: errors.length === 0, errors, endpoint: resolved.endpoint };
  },

  async testConnection(config = {}, context = {}) {
    const resolved = resolveScrapeConfig(config, context.source);
    const validation = await this.validateConfiguration(resolved, context.source);
    if (!validation.ok) {
      return {
        ok: false,
        message: validation.errors.join("; "),
        statusCode: null,
        endpoint: resolved.endpoint
      };
    }

    let page;
    try {
      page = await fetchHtml(resolved.endpoint);
    } catch (error) {
      return {
        ok: false,
        message: `Scrape fetch failed: ${error.message}`,
        statusCode: null,
        endpoint: resolved.endpoint
      };
    }

    if (!page.ok) {
      return {
        ok: false,
        message: `HTTP ${page.status} from scrape endpoint`,
        statusCode: page.status,
        endpoint: resolved.endpoint
      };
    }

    const looksHtml =
      page.contentType.includes("html") ||
      /^\s*<!doctype html/i.test(page.text) ||
      /^\s*<html[\s>]/i.test(page.text);
    if (!looksHtml) {
      return {
        ok: false,
        message:
          "Endpoint did not return HTML. Use an HTML list/news page, or prefer RSS/API when available.",
        statusCode: page.status,
        endpoint: resolved.endpoint
      };
    }

    const items = extractItems(page.text, resolved);
    if (items.length === 0) {
      return {
        ok: false,
        message:
          "HTML reachable but no list items matched the scrape rules. Refine linkHrefIncludes / profile, or add a source profile.",
        statusCode: page.status,
        endpoint: resolved.endpoint,
        profileId: resolved.profileId
      };
    }

    return {
      ok: true,
      message: `Scrape reachable; ${items.length} item(s) detected`,
      statusCode: page.status,
      itemCount: items.length,
      sampleTitles: items.slice(0, 3).map((i) => i.title).filter(Boolean),
      endpoint: resolved.endpoint,
      profileId: resolved.profileId
    };
  },

  async fetch(config = {}, opts = {}) {
    const resolved = resolveScrapeConfig(config, opts.source);
    const validation = await this.validateConfiguration(resolved, opts.source);
    if (!validation.ok) {
      throw new Error(validation.errors.join("; "));
    }

    const limit =
      Number(opts.limit) > 0 ? Number(opts.limit) : resolved.maxItems || 25;
    const page = await fetchHtml(resolved.endpoint);
    if (!page.ok) {
      throw new Error(`HTTP ${page.status} from scrape endpoint`);
    }

    const items = extractItems(page.text, { ...resolved, maxItems: limit });
    return {
      fetchedAt: new Date().toISOString(),
      rawContentType: page.contentType || "text/html",
      endpoint: resolved.endpoint,
      profileId: resolved.profileId,
      items
    };
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
      contentType: "text/html",
      processingStatus: "received",
      payload: item.payload || item,
      metadata: {
        adapterType: "scrape",
        profileId: context.profileId || null,
        sourceName: context.sourceName || ""
      },
      receivedAt: now,
      createdAt: now,
      updatedAt: now
    }));
  }
};
