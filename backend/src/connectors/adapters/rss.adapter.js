/**
 * RSS / Atom pull adapter.
 * Collects feed items and maps them toward canonical RawRecords.
 * No business / risk interpretation.
 */

import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true
});

/**
 * Normalize feed URLs before fetch. Fixes common Yle catalog mistakes:
 * trailing punctuation, deprecated /news/ paths, missing publisherIds.
 */
export function normalizeFeedEndpoint(endpoint, { preferEnglish = false } = {}) {
  let value = String(endpoint || "").trim();
  if (!value) return "";

  // Strip trailing punctuation accidentally copied from sentences.
  value = value.replace(/[.,;]+$/g, "");

  // Decode once if double-encoded query markers appear.
  try {
    if (value.includes("%3F") || value.includes("%26")) {
      value = decodeURIComponent(value);
    }
  } catch {
    // keep original
  }

  // Old Yle English path → current catalog.
  value = value.replace(
    /https?:\/\/feeds\.yle\.fi\/news\/v1\/recent\.rss/i,
    "https://feeds.yle.fi/uutiset/v1/recent.rss"
  );

  const fmiWarningsEn = "https://alerts.fmi.fi/cap/feed/rss_en-GB.rss";
  const fmiWarningsFi = "https://alerts.fmi.fi/cap/feed/rss_fi-FI.rss";
  const fmiPressEn =
    "https://en.ilmatieteenlaitos.fi/api/news/press-release/rss";

  // Any FMI / Ilmatieteen laitos URL that is not already a known-good feed
  // → map to warnings RSS (demo-safe).
  if (/ilmatieteenlaitos\.fi|alerts\.fmi\.fi|opendata\.fmi\.fi|\.fmi\.fi/i.test(value)) {
    const knownGood = new Set([fmiWarningsEn, fmiWarningsFi, fmiPressEn]);
    const bare = value.split("?")[0].replace(/\/$/, "");
    const isKnown =
      knownGood.has(value) ||
      knownGood.has(bare) ||
      /\/cap\/feed\/rss_(en-GB|fi-FI|sv-FI)\.rss$/i.test(bare) ||
      /\/api\/news\/press-release\/rss$/i.test(bare);
    if (!isKnown) {
      value = preferEnglish ? fmiWarningsEn : fmiWarningsFi;
    } else if (/\/cap\/feed\/rss_/i.test(bare) && !/rss_(en-GB|fi-FI|sv-FI)\.rss$/i.test(bare)) {
      value = preferEnglish ? fmiWarningsEn : fmiWarningsFi;
    }
  }

  // NOAA NHC "about RSS" directory page → real tropical outlook feed.
  if (/nhc\.noaa\.gov/i.test(value)) {
    const bare = value.split("?")[0].toLowerCase();
    const isXmlFeed = /\.xml$/i.test(bare);
    if (!isXmlFeed || /aboutrss/i.test(bare)) {
      value = "https://www.nhc.noaa.gov/gtwo.xml";
    }
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = url.pathname;

    if (host.includes("yle.fi") && /\/uutiset\/v1\/recent\.rss$/i.test(path)) {
      let publisher = (url.searchParams.get("publisherIds") || "").trim();
      publisher = publisher.replace(/[.,;]+$/g, "");

      const known = new Set(["YLE_UUTISET", "YLE_URHEILU", "YLE_NEWS"]);
      if (!publisher || !known.has(publisher)) {
        publisher = preferEnglish ? "YLE_NEWS" : "YLE_UUTISET";
      }

      url.search = "";
      url.searchParams.set("publisherIds", publisher);
      value = url.toString();
    }
  } catch {
    // leave as-is if not a valid URL; validateConfiguration will catch it
  }

  return value;
}

/** Demo fallbacks when the stored endpoint 404s. */
export function fallbackFeedEndpoints(source = {}, { preferEnglish = false } = {}) {
  const blob = `${source.name || ""} ${source.provider || ""} ${source.documentationUrl || ""}`.toLowerCase();
  const list = [];

  if (/fmi|ilmatieteen|meteorolog/.test(blob)) {
    list.push(
      preferEnglish
        ? "https://alerts.fmi.fi/cap/feed/rss_en-GB.rss"
        : "https://alerts.fmi.fi/cap/feed/rss_fi-FI.rss",
      "https://en.ilmatieteenlaitos.fi/api/news/press-release/rss"
    );
  }

  if (/\byle\b|yle\.fi/.test(blob)) {
    list.push(
      preferEnglish
        ? "https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_NEWS"
        : "https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET"
    );
  }

  if (/nhc|noaa|hurricane|tropical/.test(blob)) {
    list.push(
      "https://www.nhc.noaa.gov/gtwo.xml",
      "https://www.nhc.noaa.gov/index-at.xml",
      "https://www.nhc.noaa.gov/index-ep.xml",
      "https://www.nhc.noaa.gov/index-cp.xml"
    );
  }

  return [...new Set(list)];
}

/**
 * If a candidate is an HTML "feed directory" page, extract linked .xml/.rss URLs.
 */
export async function expandFeedDirectoryCandidates(url) {
  const value = String(url || "").trim();
  if (!value) return [];

  try {
    const response = await fetch(value, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,*/*",
        "User-Agent": "RiskDigitalTwinConnector/0.1"
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return [];
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const text = await response.text();
    if (
      !contentType.includes("html") &&
      !/^\s*<!doctype html/i.test(text) &&
      !/^\s*<html[\s>]/i.test(text)
    ) {
      return [];
    }

    const found = new Set();
    const hrefRegex =
      /https?:\/\/[^"'>\s]+\.(?:xml|rss|atom)(?:\?[^"'>\s]*)?/gi;
    const relativeRegex = /href=["']([^"']+\.(?:xml|rss|atom)(?:\?[^"']*)?)["']/gi;

    for (const match of text.match(hrefRegex) || []) {
      found.add(match.replace(/[.,;]+$/g, ""));
    }

    let rel;
    const base = new URL(value);
    while ((rel = relativeRegex.exec(text))) {
      try {
        found.add(new URL(rel[1], base).toString());
      } catch {
        // ignore bad relative URLs
      }
    }

    return [...found];
  } catch {
    return [];
  }
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    if (value["#text"] != null) return String(value["#text"]).trim();
    if (value["@_href"]) return String(value["@_href"]).trim();
    if (value.href) return String(value.href).trim();
  }
  return "";
}

function firstLink(link) {
  const links = asArray(link);
  for (const entry of links) {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
    if (entry && typeof entry === "object") {
      if (entry["@_rel"] === "alternate" || !entry["@_rel"]) {
        const href = entry["@_href"] || entry.href || textOf(entry);
        if (href) return href;
      }
    }
  }
  for (const entry of links) {
    const href =
      typeof entry === "string"
        ? entry
        : entry?.["@_href"] || entry?.href || textOf(entry);
    if (href) return href;
  }
  return "";
}

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
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html) {
  const raw = String(html || "");
  const alt = raw.match(/alt=["']([^"']+)["']/i);
  if (alt?.[1]) return stripHtml(alt[1]);
  const titleAttr = raw.match(/title=["']([^"']+)["']/i);
  if (titleAttr?.[1]) return stripHtml(titleAttr[1]);
  const linkText = raw.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  if (linkText?.[1]) {
    const cleaned = stripHtml(linkText[1]);
    if (cleaned) return cleaned;
  }
  return "";
}

function normalizeRssItem(item) {
  const rawSummary =
    textOf(item.description) ||
    textOf(item.summary) ||
    textOf(item["content:encoded"]);
  let title = textOf(item.title);
  if (!title) title = titleFromHtml(rawSummary);
  const summary = stripHtml(rawSummary);
  const canonicalUrl = firstLink(item.link) || textOf(item.guid);
  const externalId =
    textOf(item.guid) ||
    textOf(item.id) ||
    canonicalUrl ||
    `${title}|${textOf(item.pubDate) || textOf(item.published)}`;
  const publishedAt =
    textOf(item.pubDate) ||
    textOf(item.published) ||
    textOf(item.updated) ||
    "";

  return {
    externalId,
    title,
    summary,
    canonicalUrl,
    publishedAt,
    language: textOf(item["dc:language"]) || "",
    payload: {
      title,
      link: canonicalUrl,
      guid: textOf(item.guid) || textOf(item.id),
      pubDate: publishedAt,
      description: rawSummary,
      plainText: summary
    }
  };
}

function normalizeAtomEntry(entry) {
  const rawSummary =
    textOf(entry.summary) || textOf(entry.content) || "";
  let title = textOf(entry.title);
  if (!title) title = titleFromHtml(rawSummary);
  const summary = stripHtml(rawSummary);
  const canonicalUrl = firstLink(entry.link);
  const externalId = textOf(entry.id) || canonicalUrl || title;
  const publishedAt =
    textOf(entry.published) || textOf(entry.updated) || "";

  return {
    externalId,
    title,
    summary,
    canonicalUrl,
    publishedAt,
    language: "",
    payload: {
      title,
      link: canonicalUrl,
      id: textOf(entry.id),
      published: publishedAt,
      summary: rawSummary,
      plainText: summary
    }
  };
}

function extractItems(parsed) {
  if (parsed?.rss?.channel) {
    return asArray(parsed.rss.channel.item).map(normalizeRssItem);
  }
  if (parsed?.feed) {
    return asArray(parsed.feed.entry).map(normalizeAtomEntry);
  }
  // Some feeds nest under channel only
  if (parsed?.channel) {
    return asArray(parsed.channel.item).map(normalizeRssItem);
  }
  return [];
}

export const rssAdapter = {
  type: "rss",

  resolveConfig(config = {}) {
    const languages = config.languages || config.monitoringLanguages || [];
    const preferEnglish = Array.isArray(languages)
      ? languages.some((l) => String(l).toLowerCase().startsWith("en"))
      : false;
    const endpoint = normalizeFeedEndpoint(config.endpoint, { preferEnglish });
    return {
      ...config,
      endpoint,
      resolvedEndpoint: endpoint
    };
  },

  async validateConfiguration(config = {}) {
    const resolved = this.resolveConfig(config);
    const endpoint = resolved.endpoint;
    const errors = [];
    if (!endpoint) errors.push("endpoint is required");
    else {
      try {
        const url = new URL(endpoint);
        if (!/^https?:$/.test(url.protocol)) {
          errors.push("endpoint must be http(s)");
        }
      } catch {
        errors.push("endpoint is not a valid URL");
      }
    }
    return { ok: errors.length === 0, errors, endpoint };
  },

  async testConnection(config = {}) {
    const resolved = this.resolveConfig(config);
    const validation = await this.validateConfiguration(resolved);
    if (!validation.ok) {
      return {
        ok: false,
        message: validation.errors.join("; "),
        statusCode: null,
        endpoint: resolved.endpoint
      };
    }

    const response = await fetch(resolved.endpoint, {
      method: "GET",
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": "RiskDigitalTwinConnector/0.1"
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `HTTP ${response.status} from feed endpoint`,
        statusCode: response.status,
        endpoint: resolved.endpoint
      };
    }

    const text = await response.text();
    const contentType = String(
      response.headers.get("content-type") || ""
    ).toLowerCase();

    if (
      contentType.includes("text/html") ||
      /^\s*<!doctype html/i.test(text) ||
      /^\s*<html[\s>]/i.test(text)
    ) {
      return {
        ok: false,
        message:
          "Endpoint returned HTML, not an RSS/Atom feed. Use a real feed URL (for FMI e.g. alerts or press-release RSS).",
        statusCode: response.status,
        endpoint: resolved.endpoint
      };
    }

    let parsed;
    try {
      parsed = parser.parse(text);
    } catch (error) {
      return {
        ok: false,
        message: `Feed XML parse failed: ${error.message}`,
        statusCode: response.status,
        endpoint: resolved.endpoint
      };
    }

    const items = extractItems(parsed);
    if (items.length === 0) {
      const rootKeys = parsed && typeof parsed === "object"
        ? Object.keys(parsed).slice(0, 8).join(", ")
        : "";
      return {
        ok: false,
        message:
          `Feed reachable but no RSS/Atom items were found` +
          (rootKeys ? ` (XML roots: ${rootKeys})` : "") +
          `. This usually means the URL is an API/docs page, not a feed. For FMI prefer https://alerts.fmi.fi/cap/feed/rss_en-GB.rss or https://en.ilmatieteenlaitos.fi/api/news/press-release/rss`,
        statusCode: response.status,
        endpoint: resolved.endpoint
      };
    }

    return {
      ok: true,
      message: `Feed reachable; ${items.length} item(s) detected`,
      statusCode: response.status,
      itemCount: items.length,
      sampleTitles: items.slice(0, 3).map((i) => i.title).filter(Boolean),
      endpoint: resolved.endpoint
    };
  },

  async fetch(config = {}, { limit = 25 } = {}) {
    const resolved = this.resolveConfig(config);
    const validation = await this.validateConfiguration(resolved);
    if (!validation.ok) {
      throw new Error(validation.errors.join("; "));
    }

    const response = await fetch(resolved.endpoint, {
      method: "GET",
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": "RiskDigitalTwinConnector/0.1"
      },
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from feed endpoint (${resolved.endpoint})`);
    }

    const text = await response.text();
    const parsed = parser.parse(text);
    const items = extractItems(parsed).slice(0, limit);

    return {
      fetchedAt: new Date().toISOString(),
      rawContentType: response.headers.get("content-type") || "application/xml",
      endpoint: resolved.endpoint,
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
      contentType: "application/rss+xml",
      processingStatus: "received",
      payload: item.payload || item,
      metadata: {
        adapterType: "rss",
        sourceName: context.sourceName || ""
      },
      receivedAt: now,
      createdAt: now,
      updatedAt: now
    }));
  }
};
