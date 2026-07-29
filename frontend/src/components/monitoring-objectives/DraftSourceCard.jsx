import { ArrowIcon } from "../../lib/icons.jsx";

/**
 * Tab 2 — an Information Source still in Setup in progress (sources.draft).
 * Continuation routes into the existing Source Details workflow (business
 * access → access guidance → AI connector advice).
 */
export default function DraftSourceCard({ source, onOpen }) {
  const meta = [
    ["Provider", source.provider],
    ["Availability", source.availability],
    ["Information need", source.informationNeed],
    ["Business access", source.businessAccessStatus],
    ["Connector", source.connectorStatusLabel],
  ].filter(([, v]) => v);

  return (
    <article className="msrc msrc--draft">
      <div className="msrc__top">
        <div className="msrc__idline">
          <h4 className="msrc__name">{source.name}</h4>
          {source.provider && <span className="msrc__provider">{source.provider}</span>}
        </div>
        <span className="msrc__life msrc__life--setup">Setup in progress</span>
      </div>

      {meta.length > 0 && (
        <dl className="msrc__meta">
          {meta.map(([k, v]) => (
            <div className="msrc__meta-row" key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="msrc__actions">
        <button className="btn btn--primary" onClick={() => onOpen(source, "access")}>
          Continue setup <ArrowIcon width={14} height={14} />
        </button>
        <button className="btn btn--ghost" onClick={() => onOpen(source, "access")}>
          Review access
        </button>
        <button className="btn btn--ghost" onClick={() => onOpen(source, "connector")}>
          View AI connector advice
        </button>
      </div>
    </article>
  );
}
