import { ArrowIcon } from "../../lib/icons.jsx";

/**
 * Tab 1 — an Information Source that is In use (sources.active).
 * Overview + navigation only: actions route to the existing Source Details
 * workflow. No AI recommendation controls, and no invented coverage-fit values.
 */
export default function CurrentSourceCard({ source, onOpen, onDisable }) {
  const meta = [
    ["Provider", source.provider],
    ["Source kind", source.sourceKindLabel],
    ["Information need", source.informationNeed],
    ["Connector", source.connectorStatusLabel],
  ].filter(([, v]) => v);

  return (
    <article className="msrc msrc--active">
      <div className="msrc__top">
        <div className="msrc__idline">
          <h4 className="msrc__name">{source.name}</h4>
          {source.provider && <span className="msrc__provider">{source.provider}</span>}
        </div>
        <span className="msrc__life msrc__life--use">In use</span>
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
        <button className="btn btn--primary" onClick={() => onOpen(source, "overview")}>
          Open source <ArrowIcon width={14} height={14} />
        </button>
        <button className="btn btn--ghost" onClick={() => onOpen(source, "access")}>
          Review access
        </button>
        <button className="btn btn--ghost" onClick={() => onOpen(source, "connector")}>
          Connector setup
        </button>
        <button className="btn btn--quiet" onClick={() => onDisable(source)}>
          Disable
        </button>
      </div>
    </article>
  );
}
