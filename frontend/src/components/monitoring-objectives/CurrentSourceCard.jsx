import { ArrowIcon } from "../../lib/icons.jsx";

export default function CurrentSourceCard({ source, onView, onModify, onDisable }) {
  const meta = [
    ["Provider", source.provider],
    ["Source kind", source.sourceKindLabel],
    ["Information need", source.informationNeed],
  ].filter(([, value]) => value);

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
          {meta.map(([key, value]) => (
            <div className="msrc__meta-row" key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="msrc__actions">
        <button className="btn btn--primary" onClick={() => onView(source)}>
          View <ArrowIcon width={14} height={14} />
        </button>
        <button className="btn btn--ghost" onClick={() => onModify(source)}>
          Modify
        </button>
        <button className="btn btn--quiet" onClick={() => onDisable(source)}>
          Disable
        </button>
      </div>
    </article>
  );
}
