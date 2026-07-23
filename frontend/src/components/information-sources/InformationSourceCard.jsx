import { CheckIcon } from "../../lib/icons.jsx";

function MetaRow({ label, value }) {
  return (
    <div className="isrc-meta__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * A selectable information-source card. Multi-select (checkbox semantics),
 * fully keyboard-accessible (Enter/Space toggles). Shows the eight fields the
 * sprint requires — name, description, kind, role, suggested use, inputs,
 * access type and demo-data mode.
 */
export default function InformationSourceCard({ source, selected, onToggle }) {
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={onKey}
      className={`isrc-card${selected ? " isrc-card--selected" : ""}`}
    >
      <div className="isrc-card__head">
        <div className="isrc-card__name">{source.name}</div>
        <span className={`isrc-check${selected ? " isrc-check--on" : ""}`} aria-hidden>
          {selected && <CheckIcon width={13} height={13} />}
        </span>
      </div>

      <p className="isrc-card__desc">{source.description}</p>

      <dl className="isrc-meta">
        <MetaRow label="Source kind" value={source.kindLabel} />
        <MetaRow label="Source role" value={source.roleLabel} />
        <MetaRow label="Suggested use" value={source.suggestedUse} />
        <MetaRow label="Supported inputs" value={source.supportedInputs} />
        <MetaRow label="Access type" value={source.accessType} />
      </dl>

      <div className="isrc-card__foot">
        <span className={`isrc-mode ${source.requiresSimulation ? "isrc-mode--demo" : "isrc-mode--live"}`}>
          <i />
          {source.demoDataMode}
        </span>
      </div>
    </div>
  );
}
