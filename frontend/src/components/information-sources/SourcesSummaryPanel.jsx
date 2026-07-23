import Button from "../shared/Button.jsx";
import { ArrowIcon } from "../../lib/icons.jsx";

function Stat({ n, label, strong }) {
  return (
    <div className={`summstat${strong ? " summstat--strong" : ""}`}>
      <span className="summstat__n">{n}</span>
      <span className="summstat__l">{label}</span>
    </div>
  );
}

/**
 * Sticky summary + action bar. Shows the selected objective and live
 * internal/external/historical counts, and offers Back / Continue.
 * Continue is disabled until at least one source is selected.
 */
export default function SourcesSummaryPanel({
  objectiveName,
  counts,
  onBack,
  onContinue,
  canContinue,
}) {
  return (
    <div className="summbar">
      <div className="summbar__inner container">
        <div className="summbar__info">
          <div className="summbar__obj">
            <span className="summbar__lbl">Selected objective</span>
            <span className="summbar__val">{objectiveName}</span>
          </div>
          <div className="summbar__counts">
            <Stat n={counts.total} label="Selected" strong />
            <span className="summbar__sep" />
            <Stat n={counts.internal} label="Internal" />
            <Stat n={counts.external} label="External" />
            <Stat n={counts.historical} label="Historical" />
          </div>
        </div>

        <div className="summbar__actions">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button variant="primary" onClick={onContinue} disabled={!canContinue}>
            Continue <ArrowIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
