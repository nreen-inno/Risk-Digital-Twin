import ReadinessBadge from "../shared/ReadinessBadge.jsx";

/**
 * C. Access Guidance — human-readable readiness + next actions from the backend.
 * Never exposes raw JSON.
 */
export default function AccessGuidancePanel({ guidance, status, error, onRetry, hasSaved }) {
  return (
    <section className="sd-card surface">
      <div className="sd-card__head">
        <span className="eyebrow">Access guidance</span>
        {guidance && <ReadinessBadge readiness={guidance.readiness} />}
      </div>

      {!hasSaved && status === "idle" && (
        <p className="sd-muted">Save your business-access answers above to see tailored guidance.</p>
      )}

      {status === "loading" && (
        <div className="sd-inline-load">
          <span className="sd-spinner" aria-hidden />
          Loading guidance…
        </div>
      )}

      {status === "error" && (
        <div className="sd-error">
          <p>Couldn’t load guidance right now. Your saved answers are safe.</p>
          <button className="btn btn--ghost" onClick={onRetry}>Retry</button>
        </div>
      )}

      {status === "ready" && guidance && (
        <div className="fade">
          {guidance.title && <h3 className="sd-guide__title">{guidance.title}</h3>}
          {guidance.summary && <p className="sd-guide__summary">{guidance.summary}</p>}

          {guidance.nextActions.length > 0 && (
            <div className="sd-actions-block">
              <div className="sd-block-h">Next actions</div>
              <ul className="sd-check-list">
                {guidance.nextActions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <div className={`sd-proceed ${guidance.canProceedToConnector ? "sd-proceed--ok" : "sd-proceed--wait"}`}>
            {guidance.canProceedToConnector
              ? "This source is ready to review connection advice."
              : "You can still ask for connection advice, but some access steps remain."}
          </div>
        </div>
      )}
    </section>
  );
}
