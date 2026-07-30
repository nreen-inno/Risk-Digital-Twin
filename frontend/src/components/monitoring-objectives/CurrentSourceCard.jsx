import { useState } from "react";
import { ArrowIcon } from "../../lib/icons.jsx";

function firstValue(source, keys, fallback = "Not configured") {
  const raw = source?.raw || {};
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function asText(value, fallback = "Not configured") {
  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  if (value && typeof value === "object") {
    return value.label || value.name || value.mode || JSON.stringify(value);
  }
  return value || fallback;
}

export default function CurrentSourceCard({ source, onModify, onDisable, busy = false }) {
  const [expanded, setExpanded] = useState(false);

  const operational = [
    ["Connector status", source.connectorStatusLabel || "Not configured"],
    ["Connection method", asText(firstValue(source, ["connectionMethod", "transport", "connectorType", "sourceKind"]), source.sourceKindLabel)],
    ["Collection frequency", asText(firstValue(source, ["collectionFrequency", "refreshFrequency", "recommendedInterval", "schedule"]))],
    ["Filters / topics", asText(firstValue(source, ["filters", "monitoringFilters", "topics", "keywords", "tags"]))],
    ["Monitoring instructions", asText(firstValue(source, ["monitoringInstructions", "aiInstructions", "informationNeed"]), source.informationNeed || "Not configured")],
    ["Last collection", asText(firstValue(source, ["lastCollectedAt", "lastRunAt", "lastSuccessfulRunAt"]))],
    ["Next collection", asText(firstValue(source, ["nextCollectionAt", "nextRunAt"]))],
  ];

  return (
    <article className="msrc msrc--active">
      <div className="msrc__top">
        <div className="msrc__idline">
          <h4 className="msrc__name">{source.name}</h4>
          {source.provider && <span className="msrc__provider">{source.provider}</span>}
        </div>
        <span className="msrc__life msrc__life--use">In use</span>
      </div>

      <dl className="msrc__meta">
        <div className="msrc__meta-row">
          <dt>Connector</dt>
          <dd>{source.connectorStatusLabel || "Not configured"}</dd>
        </div>
        <div className="msrc__meta-row">
          <dt>Frequency</dt>
          <dd>{asText(firstValue(source, ["collectionFrequency", "refreshFrequency", "recommendedInterval", "schedule"]))}</dd>
        </div>
        <div className="msrc__meta-row">
          <dt>Monitoring focus</dt>
          <dd>{source.informationNeed || "Not configured"}</dd>
        </div>
      </dl>

      {expanded && (
        <div className="msrc__operational fade">
          <div className="msrc__operational-head">
            <strong>Operational connector information</strong>
            <span>Configuration currently available for this active source</span>
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
        <button className="btn btn--ghost" onClick={() => onModify(source)} disabled={busy}>
          Modify
        </button>
        <button className="btn btn--quiet" onClick={() => onDisable(source)} disabled={busy}>
          {busy ? "Updating…" : "Disable"}
        </button>
      </div>
    </article>
  );
}
