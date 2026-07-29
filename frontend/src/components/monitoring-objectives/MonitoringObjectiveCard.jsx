import { ObjectiveIcon, ArrowIcon } from "../../lib/icons.jsx";
import "../../styles/monitoring-workspace.css";

/**
 * A single Monitoring Objective on the overview grid. The whole card is one
 * clickable, keyboard-accessible control that opens the objective's workspace.
 * It shows "Sources in use" (from the backend counts) — never AI suggestions,
 * and never runs AI. Counts may be null while they load or if unavailable.
 */
export default function MonitoringObjectiveCard({ objective, counts, onOpen }) {
  const { name, businessQuestion, description, factors } = objective;

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const hasCounts = counts && typeof counts.active === "number";
  const empty = hasCounts && counts.active === 0 && counts.draft === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      className="obj obj--open"
      aria-label={`Open ${name} workspace`}
    >
      <div className="obj__head">
        <span className="obj__icon">
          <ObjectiveIcon iconKey={objective.iconKey} />
        </span>
        <div>
          <h3 className="obj__title">{name}</h3>
          <div className="obj__question">{businessQuestion}</div>
        </div>
      </div>

      {description && <p className="obj__desc">{description}</p>}

      {factors.length > 0 && (
        <div>
          <div className="obj__section-label">Related risk factors</div>
          <div className="factors">
            {factors.map((f) => (
              <span className="factor" key={f}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="obj__section-label">Sources in use</div>
        <div className="obj__sources-status">
          {!hasCounts ? (
            <span className="muted">Open to view attached sources</span>
          ) : empty ? (
            <span className="muted">No sources yet — open to add</span>
          ) : (
            <>
              <span className="obj__count">
                <strong>{counts.active}</strong> in use
              </span>
              {counts.draft > 0 && (
                <span className="obj__count obj__count--muted">
                  {" "}
                  · {counts.draft} setup in progress
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="obj__foot obj__foot--open">
        <span className="obj__open-hint">
          Open objective <ArrowIcon width={15} height={15} />
        </span>
      </div>
    </div>
  );
}
