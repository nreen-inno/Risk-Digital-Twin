import { ObjectiveIcon, ArrowIcon } from "../../lib/icons.jsx";
import Button from "../shared/Button.jsx";

/**
 * Confirmation surface shown once an objective is chosen. Restates the business
 * question, quantifies the suggested integration surface, and offers Continue.
 */
export default function SelectedObjectivePanel({ objective, onContinue }) {
  return (
    <section className="selpanel fade-in" aria-live="polite">
      <div className="selpanel__grid">
        <div>
          <span className="eyebrow">Selected Monitoring Objective</span>
          <h2 className="selpanel__title">
            <ObjectiveIcon iconKey={objective.iconKey} width={24} height={24} />
            {objective.name}
          </h2>
          <p className="selpanel__q">{objective.businessQuestion}</p>
        </div>

        <div className="selpanel__stat">
          <div className="selpanel__num">
            {objective.sourceCount}
            <span>sources</span>
          </div>
          <div className="selpanel__statlabel">
            Suggested information sources across internal, external and
            historical tiers.
          </div>
        </div>

        <div className="selpanel__cta">
          <Button variant="onDark" size="lg" onClick={onContinue}>
            Continue <ArrowIcon />
          </Button>
          <span className="selpanel__hint">Next: information source selection</span>
        </div>
      </div>
    </section>
  );
}
