import { statusMeta } from "../../lib/advisor.js";

/** One Information Need in the coverage dashboard, with a status chip. */
export default function CoverageCard({ need }) {
  const meta = statusMeta(need.status);
  return (
    <div className="cov-card" style={{ borderTopColor: meta.color }}>
      <div className="cov-card__head">
        <span className="cov-card__name">{need.name}</span>
        <span
          className="cov-chip"
          style={{ color: meta.color, background: meta.bg, borderColor: meta.bd }}
        >
          {meta.label}
        </span>
      </div>
      {typeof need.coverage === "number" && (
        <div className="cov-bar" aria-hidden>
          <i style={{ width: `${Math.max(0, Math.min(100, need.coverage))}%`, background: meta.color }} />
        </div>
      )}
      {need.detail && <p className="cov-card__detail">{need.detail}</p>}
    </div>
  );
}
