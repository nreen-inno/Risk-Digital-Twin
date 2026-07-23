import CoverageCard from "./CoverageCard.jsx";
import { STATUS_META } from "../../lib/advisor.js";

const ORDER = ["strong", "partial", "missing", "unknown"];

/** Coverage Assessment presented as a business dashboard of Information Needs. */
export default function CoverageSection({ summary, needs, counts }) {
  return (
    <section className="adv-section">
      <div className="section-head">
        <h2>Coverage assessment</h2>
        <span>How well current sources cover this objective’s information needs</span>
      </div>

      {summary && <p className="adv-summary">{summary}</p>}

      <div className="cov-stats">
        {ORDER.map((key) => {
          const m = STATUS_META[key];
          return (
            <div className="cov-stat" key={key} style={{ borderColor: m.bd }}>
              <span className="cov-stat__n" style={{ color: m.color }}>{counts[key] || 0}</span>
              <span className="cov-stat__l">
                <i style={{ background: m.color }} />
                {m.label}
              </span>
            </div>
          );
        })}
      </div>

      {needs.length > 0 ? (
        <div className="cov-grid">
          {needs.map((n) => (
            <CoverageCard key={n.id} need={n} />
          ))}
        </div>
      ) : (
        <p className="adv-muted">No information needs were returned for this objective.</p>
      )}
    </section>
  );
}
