import { rssAdapter } from "./rss.adapter.js";
import { restAdapter } from "./rest.adapter.js";
import { scrapeAdapter } from "./scrape.adapter.js";

const adapters = {
  rss: rssAdapter,
  atom: rssAdapter,
  rest: restAdapter,
  restapi: restAdapter,
  scrape: scrapeAdapter,
  web: scrapeAdapter
};

/**
 * Map proposal connectionMethod → reusable adapter family.
 * New adapter types are rare; prefer known families + config.
 */
export function resolveAdapterType(connectionMethod = "") {
  const method = String(connectionMethod || "").toLowerCase().trim();

  if (["rss", "atom", "feed"].includes(method)) return "rss";
  if (["api", "rest", "restapi", "rest-api", "http", "json"].includes(method)) {
    return "rest";
  }
  if (["file", "csv", "excel", "upload"].includes(method)) return "file";
  if (["database", "db", "sql"].includes(method)) return "database";
  if (["email", "mail"].includes(method)) return "email";
  if (["scrape", "web", "html"].includes(method)) return "scrape";

  return method || "unknown";
}

export function getAdapter(adapterType) {
  const type = String(adapterType || "").toLowerCase();
  const adapter = adapters[type];
  if (!adapter) {
    const err = new Error(
      `No executable adapter registered for type "${adapterType}". Demo currently supports RSS/Atom, REST JSON, and HTML scrape.`
    );
    err.code = "ADAPTER_NOT_IMPLEMENTED";
    throw err;
  }
  return adapter;
}

export function listRegisteredAdapters() {
  return Object.keys(adapters);
}
