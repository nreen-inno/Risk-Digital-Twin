import { ObjectiveIcon, CheckIcon } from "../../lib/icons.jsx";
import SourceGroup from "./SourceGroup.jsx";
import Button from "../shared/Button.jsx";

/**
 * A single Monitoring Objective. Fully keyboard-accessible: the whole card is a
 * radio-style option (Enter/Space selects), and it also carries an explicit
 * Select button for pointer users.
 */
export default function MonitoringObjectiveCard({ objective, selected, onSelect }) {
  const { name, businessQuestion, description, factors, sources } = objective;

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={handleKey}
      onClick={onSelect}
      className={`obj${selected ? " obj--selected" : ""}`}
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
        <div className="obj__section-label">Suggested information sources</div>
        <div className="sources">
          <SourceGroup tier="internal" items={sources.internal} />
          <SourceGroup tier="external" items={sources.external} />
          <SourceGroup tier="historical" items={sources.historical} />
        </div>
      </div>

      <div className="obj__foot">
        {selected ? (
          <span className="obj__selected-tag">
            <CheckIcon /> Selected
          </span>
        ) : (
          <span className="muted" style={{ fontSize: 12.5 }}>
            {objective.sourceCount} suggested sources
          </span>
        )}
        <Button
          variant={selected ? "dark" : "ghost"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          aria-label={`Select ${name}`}
          tabIndex={-1}
        >
          {selected ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
}
