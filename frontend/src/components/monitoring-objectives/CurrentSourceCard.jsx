import { useState } from "react";
import { ArrowIcon } from "../../lib/icons.jsx";

function firstValue(source, keys, fallback = "Not configured") {
  const raw = source?.raw || {};
  for (const key of keys) {
    const value = raw[key] ?? source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  // Nested connector definition / config shapes
  const nested = [
    raw?.config?.pollInterval,
    raw?.connectorDefinition?.config?.pollInterval,
    raw?.technicalConfiguration?.pollInterval,
  ];
  for (const value of nested) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function topicsFromSource(source) {
  const raw = source?.raw || {};
  const direct = firstValue(
    source,
    ["filters", "monitoringFilters", "topics", "keywords", "tags"],
    null
  );
  if (direct && direct !== "Not configured") return direct;

  const mp =
    raw.monitoringConfiguration?.monitoringProfile ||
    raw.connectorDefinition?.monitoringConfiguration?.monitoringProfile ||
    {};
  const terms = [
    ...(mp.includeTerms || []),
    ...(mp.entities || []),
    ...(mp.locations || []),
  ].filter(Boolean);
  if (terms.length) return terms;
  return "Not configured";
}

function formatFrequency(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "Not configured") return "Not configured";
  const match = raw.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  );
  if (!match) return raw;
  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  if (!days && hours === 1 && !minutes) return "Hourly";
  if (!days && hours && !minutes) return `Every ${hours} hours`;
  if (days === 1 && !hours && !minutes) return "Daily";
  if (!days && !hours && minutes) return `Every ${minutes} minutes`;
  return raw;
}

function formatWhen(value) {
  if (!value || value === "Not configured") return "Not configured";
  const text = String(value).trim();
  if (/awaiting/i.test(text)) return text;
  const t = Date.parse(text);
  if (Number.isNaN(t)) return text;
  const diffMs = Date.now() - t;
  const mins = Math.round(diffMs / 60000);
  if (mins >= 0 && mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours >= 0 && hours < 48) return `${hours}h ago`;
  try {
    return new Date(t).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return text;
  }
}

function asText(value, fallback = "Not configured") {
  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  if (value && typeof value === "object") {
    return value.label || value.name || value.mode || JSON.stringify(value);
  }
  return value || fallback;
}

function shortenFocus(value, max = 100) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const at = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf(" "));
  return `${(at > 40 ? cut.slice(0, at) : cut).trim()}…`;
}

function monitoringFocusOf(source) {
  const raw = source?.raw || {};
  // Prefer the user's source description when present; else short generated focus.
  const preferred =
    source?.informationNeed ||
    raw.informationNeed ||
    raw.monitoringFocus ||
    source?.monitoringFocus ||
    "";
  if (preferred) return shortenFocus(preferred, 100);

  const mp =
    raw.monitoringConfiguration?.monitoringProfile ||
    raw.connectorDefinition?.monitoringConfiguration?.monitoringProfile ||
    {};
  const terms = [
    ...(mp.includeTerms || []),
    ...(mp.entities || []),
    ...(mp.locations || []),
  ].filter(Boolean);
  if (terms.length) return shortenFocus(terms.slice(0, 4).join(", "), 100);
  return "Not configured";
}

export default function CurrentSourceCard({ source, onModify, onDisable, busy = false }) {
  const [expanded, setExpanded] = useState(false);
  const isDemoMock = Boolean(source.demoMock || source.raw?.demoMock);
  const frequency = formatFrequency(
    firstValue(source, [
      "collectionFrequency",
      "refreshFrequency",
      "pollInterval",
      "recommendedInterval",
      "schedule",
    ])
  );
  const monitoringFocus = monitoringFocusOf(source);
  const filtersTopics = asText(topicsFromSource(source));
  const lastCollection = formatWhen(
    firstValue(source, ["lastCollectedAt", "lastRunAt", "lastSuccessfulRunAt"])
  );
  const nextCollection = formatWhen(
    firstValue(source, ["nextCollectionAt", "nextRunAt"])
  );

  const connectorLabel = isDemoMock
    ? "Active (demo mock)"
    : source.connectorStatusLabel || "Not configured";

  const operational = [
    ["Connector status", connectorLabel],
    [
      "Connection method",
      isDemoMock
        ? "Mock connection (demo)"
        : asText(
            firstValue(source, [
              "connectionMethod",
              "transport",
              "connectorType",
              "sourceKind",
            ]),
            source.sourceKindLabel
          ),
    ],
    ["Collection frequency", frequency],
    ["Filters / topics", filtersTopics],
    ["Monitoring instructions", asText(monitoringFocus)],
    ["Last collection", lastCollection],
    ["Next collection", nextCollection],
  ];

  return (
    <article className={`msrc msrc--active${isDemoMock ? " msrc--demo-mock" : ""}`}>
      <div className="msrc__top">
        <div className="msrc__idline">
          <h4 className="msrc__name">{source.name}</h4>
          {source.provider && <span className="msrc__provider">{source.provider}</span>}
        </div>
        <div className="msrc__badges">
          <span className="msrc__life msrc__life--use">In use</span>
          {isDemoMock && (
            <span className="msrc__life msrc__life--mock">
              {source.demoMockLabel || "Demo mock connection"}
            </span>
          )}
        </div>
      </div>

      <dl className="msrc__meta">
        <div className="msrc__meta-row">
          <dt>Connector</dt>
          <dd>{connectorLabel}</dd>
        </div>
        <div className="msrc__meta-row">
          <dt>Frequency</dt>
          <dd>{frequency}</dd>
        </div>
        <div className="msrc__meta-row">
          <dt>Monitoring focus</dt>
          <dd>{monitoringFocus}</dd>
        </div>
      </dl>

      {isDemoMock && (
        <p className="msrc__mock-note">
          Mock connection for the published steel case — replace by onboarding a
          live EU Trade RSS (or MEPS) connector when you want real collection.
        </p>
      )}

      {expanded && (
        <div className="msrc__operational fade">
          <div className="msrc__operational-head">
            <strong>Operational connector information</strong>
            <span>
              {isDemoMock
                ? "Simulated schedule and topics for demo — not live-fetched"
                : "Configuration currently available for this active source"}
            </span>
          </div>
          <dl className="msrc__operational-grid">
            {operational.map(([key, value]) => (
              <div className="msrc__operational-row" key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="msrc__actions">
        <button className="btn btn--primary" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Hide details" : "View"} <ArrowIcon width={14} height={14} />
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => onModify(source)}
          disabled={busy || isDemoMock}
          title={isDemoMock ? "Replace this mock by adding a live source" : undefined}
        >
          Modify
        </button>
        <button
          className="btn btn--quiet"
          onClick={() => onDisable(source)}
          disabled={busy || isDemoMock}
          title={isDemoMock ? "Demo mocks stay until a live source is added" : undefined}
        >
          {busy ? "Updating…" : "Disable"}
        </button>
      </div>
    </article>
  );
}
