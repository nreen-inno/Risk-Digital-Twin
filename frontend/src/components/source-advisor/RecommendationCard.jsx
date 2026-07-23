import { useState } from "react";
import { priorityMeta, statusMeta } from "../../lib/advisor.js";
import { CheckIcon } from "../../lib/icons.jsx";

/**
 * One AI recommendation. Front shows priority, type, source, provider,
 * availability, short reason and business value. Expands to reveal business
 * value, next steps and limitations. Accept / Reject / Alternative actions.
 * No technical integration details are shown.
 */
export default function RecommendationCard({ rec, decision, onAccept, onReject, onAlternative }) {
  const [open, setOpen] = useState(false);
  const pm = priorityMeta(rec.priority);
  const am = statusMeta(rec.availabilityStatus);
  const accepted = decision === "accepted";
  const rejected = decision === "rejected";

  return (
    <article className={`rec ${accepted ? "rec--accepted" : ""} ${rejected ? "rec--rejected" : ""}`}>
      <div className="rec__top">
        <span className="rec__prio" style={{ color: pm.color, background: pm.bg, borderColor: pm.bd }}>
          {pm.label}
        </span>
        <span className="rec__type">{rec.recommendationType}</span>
        {rec.confidence != null && (
          <span className="rec__conf" title="AI confidence">
            <span className="rec__conf-bar"><i style={{ width: `${Math.round(rec.confidence * 100)}%` }} /></span>
            {Math.round(rec.confidence * 100)}%
          </span>
        )}
      </div>

      <div className="rec__body">
        <div className="rec__idline">
          <h3 className="rec__name">{rec.sourceName}</h3>
          {rec.provider && <span className="rec__provider">{rec.provider}</span>}
        </div>
        <span className="avail-chip" style={{ color: am.color, background: am.bg, borderColor: am.bd }}>
          <i style={{ background: am.color }} />
          {rec.availabilityLabel || am.label}
        </span>

        {rec.shortReason && <p className="rec__reason">{rec.shortReason}</p>}

        {rec.businessValue && (
          <div className="rec__value">
            <span className="rec__value-k">Business value</span>
            <span className="rec__value-v">{rec.businessValue}</span>
          </div>
        )}

        {open && (
          <div className="rec__more fade">
            {rec.nextSteps.length > 0 && (
              <div className="rec__block">
                <div className="rec__block-h">Next steps</div>
                <ul className="rec__list">
                  {rec.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {rec.limitations.length > 0 && (
              <div className="rec__block">
                <div className="rec__block-h">Limitations</div>
                <ul className="rec__list rec__list--warn">
                  {rec.limitations.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {rec.nextSteps.length === 0 && rec.limitations.length === 0 && (
              <p className="adv-muted">No additional detail provided.</p>
            )}
          </div>
        )}

        {(rec.nextSteps.length > 0 || rec.limitations.length > 0) && (
          <button className="rec__expand" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Show less" : "Show next steps & limitations"}
            <span className={`rec__chev ${open ? "up" : ""}`}>⌄</span>
          </button>
        )}
      </div>

      <div className="rec__actions">
        <button className={`btn ${accepted ? "btn--accepted" : "btn--accept"}`} onClick={onAccept}>
          {accepted ? (<><CheckIcon width={14} height={14} /> Accepted</>) : "Accept"}
        </button>
        <button className={`btn ${rejected ? "btn--rejected" : "btn--reject"}`} onClick={onReject}>
          {rejected ? "Rejected" : "Reject"}
        </button>
        <button className="btn btn--alt" onClick={onAlternative}>Alternative</button>
      </div>
    </article>
  );
}
