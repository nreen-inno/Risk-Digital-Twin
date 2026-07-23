import { PlusIcon } from "../../lib/icons.jsx";

/**
 * Placeholder invitation to add a bespoke information source. Non-functional
 * for this sprint — activating it surfaces a calm "coming next" message.
 */
export default function CustomInformationSourceCard({ onActivate }) {
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };
  return (
    <div role="button" tabIndex={0} className="custom" onClick={onActivate} onKeyDown={onKey}>
      <span className="custom__plus">
        <PlusIcon />
      </span>
      <div>
        <div className="custom__title">Add Custom Information Source</div>
        <div className="custom__desc">
          Define a source that isn’t listed — a proprietary system, a file feed
          or a partner API. Configuration will be available in a later sprint.
        </div>
      </div>
      <span className="chip custom__soon">Coming next</span>
    </div>
  );
}
