export default function DisabledSourcesSection({ sources, onReenable, busySourceId = "" }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="wsempty">
        <h3>No disabled sources</h3>
        <p>Sources disabled from active use or removed from onboarding will appear here.</p>
      </div>
    );
  }

  return (
    <div className="msrc-list">
      {sources.map((source) => (
        <article className="msrc msrc--disabled" key={source.id}>
          <div className="msrc__top">
            <div className="msrc__idline">
              <h4 className="msrc__name">{source.name}</h4>
              {source.provider && <span className="msrc__provider">{source.provider}</span>}
            </div>
            <span className="msrc__life msrc__life--disabled">Disabled</span>
          </div>

          <dl className="msrc__meta">
            <div className="msrc__meta-row">
              <dt>Previous connector status</dt>
              <dd>{source.connectorStatusLabel || "Not configured"}</dd>
            </div>
            <div className="msrc__meta-row">
              <dt>Information need</dt>
              <dd>{source.informationNeed || "Not specified"}</dd>
            </div>
            <div className="msrc__meta-row">
              <dt>Disabled</dt>
              <dd>{source.raw?.disabledAt ? new Date(source.raw.disabledAt).toLocaleString() : "Date not available"}</dd>
            </div>
          </dl>

          <div className="msrc__actions">
            <button
              className="btn btn--primary"
              onClick={() => onReenable(source)}
              disabled={busySourceId === source.id}
            >
              {busySourceId === source.id ? "Restoring…" : "Restore to onboarding"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
