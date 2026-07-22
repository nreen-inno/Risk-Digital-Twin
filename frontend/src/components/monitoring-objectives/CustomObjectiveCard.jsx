import { PlusIcon } from "../../lib/icons.jsx";

/**
 * Invitation to define a bespoke monitoring objective. Non-functional for now —
 * activating it surfaces a calm "coming next" message via the parent.
 */
export default function CustomObjectiveCard({ onActivate }) {
  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={handleKey}
      className="custom"
    >
      <span className="custom__plus">
        <PlusIcon />
      </span>
      <div>
        <div className="custom__title">Create Custom Monitoring Objective</div>
        <div className="custom__desc">
          Create your own business monitoring objective. AI will later suggest
          enterprise risks, risk factors, information sources and connector
          configuration.
        </div>
      </div>
      <span className="chip custom__soon">Coming next</span>
    </div>
  );
}
