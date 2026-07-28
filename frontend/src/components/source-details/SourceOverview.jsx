/**
 * A. Source Overview — restates the accepted recommendation in business terms.
 */
export default function SourceOverview({ recommendation, availabilityLabel }) {
  const r = recommendation || {};
  const rows = [
    ["Provider", r.provider],
    ["Information need", r.informationNeed],
    ["Recommendation type", r.recommendationType],
    ["Availability", availabilityLabel || r.availabilityLabel],
  ].filter(([, v]) => v);

  return (
    <section className="sd-card surface">
      <span className="eyebrow">Source overview</span>
      <h1 className="sd-title">{r.sourceName || "Information source"}</h1>

      {rows.length > 0 && (
        <dl className="sd-meta">
          {rows.map(([k, v]) => (
            <div className="sd-meta__row" key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {r.shortReason && <p className="sd-reason">{r.shortReason}</p>}

      {r.businessValue && (
        <div className="sd-value">
          <span className="sd-value__k">Business value</span>
          <span className="sd-value__v">{r.businessValue}</span>
        </div>
      )}
    </section>
  );
}
