import Button from "../shared/Button.jsx";
import { ArrowIcon } from "../../lib/icons.jsx";

function Stat({ n, label, tone }) {
  return (
    <div className="asum__stat">
      <span className="asum__n" style={tone ? { color: tone } : undefined}>{n}</span>
      <span className="asum__l">{label}</span>
    </div>
  );
}

/**
 * Sticky summary panel: monitoring objective, coverage summary, and the
 * accepted / rejected tallies. Continue is disabled until one recommendation
 * has been accepted.
 */
export default function SummaryPanel({
  objectiveName,
  coverageCounts,
  acceptedCount,
  rejectedCount,
  canContinue,
  onBack,
  onContinue,
}) {
  return (
    <div className="asum">
      <div className="asum__inner container">
        <div className="asum__info">
          <div className="asum__obj">
            <span className="asum__lbl">Monitoring objective</span>
            <span className="asum__val">{objectiveName}</span>
          </div>

          <div className="asum__group">
            <span className="asum__coverage">
              <b style={{ color: "var(--ok)" }}>{coverageCounts.strong}</b> strong ·
              <b style={{ color: "var(--warn)" }}> {coverageCounts.partial}</b> partial ·
              <b style={{ color: "var(--danger)" }}> {coverageCounts.missing}</b> missing
            </span>
            <span className="asum__sep" />
            <Stat n={acceptedCount} label="Accepted" tone="#7CF0C0" />
            <Stat n={rejectedCount} label="Rejected" tone="#F3A9B6" />
          </div>
        </div>

        <div className="asum__actions">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button variant="primary" onClick={onContinue} disabled={!canContinue}>
            Continue <ArrowIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
