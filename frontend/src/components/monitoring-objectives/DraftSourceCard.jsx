import { ArrowIcon } from "../../lib/icons.jsx";

export default function DraftSourceCard({ source, onboardingReason, onContinue, onRemove }) {
  const meta = [
    ["Provider", source.provider],
    ["Source kind", source.sourceKindLabel],
    ["Information need", source.informationNeed],
  ].filter(([, value]) => value);

  return (
    <article className="msrc msrc--draft">
      <div className="msrc__top">
        <div className="msrc__idline">
          <h4 className="msrc__name">{source.name}</h4>
          {source.provider && <span className="msrc__provider">{source.provider}</span>}
        </div>
        <span className="msrc__life msrc__life--setup">Source onboarding</span>
      </div>

      {onboardingReason && (
        <div className="msrc__reason">
          <strong>Why this source is here</strong>
          <span>{onboardingReason}</span>
        </div>
      )}

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
        <button className="btn btn--primary" onClick={() => onContinue(source)}>
          Continue onboarding <ArrowIcon width={14} height={14} />
        </button>
        <button className="btn btn--quiet" onClick={() => onRemove(source)}>
          Remove
        </button>
      </div>
    </article>
  );
}
