import { useState } from "react";
import { priorityMeta, statusMeta } from "../../lib/advisor.js";
import { CheckIcon, ArrowIcon } from "../../lib/icons.jsx";

/**
 * One AI recommendation. Accepting it now persists an Information Source
 * (Sprint 3) and reveals an "Open source details" action. Duplicate acceptance
 * is treated as success by the parent. No technical integration details shown.
 */
export default function RecommendationCard({
  rec,
  decision,
  accept,
  onAccept,
  onOpenDetails,
  onReject,
  onAlternative,
}) {
  const [open, setOpen] = useState(false);
  const pm = priorityMeta(rec.priority);
  const am = statusMeta(rec.availabilityStatus);

  const acceptStatus = accept?.status || "idle";
  const isAccepting = acceptStatus === "accepting";
  const isAccepted = acceptStatus === "accepted";
  const isError = acceptStatus === "error";
  const rejected = decision === "rejected";

  return (
    <article className={`rec ${isAccepted ? "rec--accepted" : ""} ${rejected ? "rec--rejected" : ""}`}>
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

        {/* Accepted confirmation */}
        {isAccepted && (
          <div className="rec__saved fade">
            <CheckIcon width={14} height={14} />
            {accept.duplicate
              ? "Already saved as an Information Source."
              : "Saved as an Information Source."}
          </div>
        )}
        {isError && (
          <div className="rec__saveerr fade">Couldn’t save this recommendation. Please retry.</div>
        )}
      </div>

      <div className="rec__actions">
        {isAccepted ? (
          <>
            <button className="btn btn--accepted" disabled>
              <CheckIcon width={14} height={14} /> Accepted
            </button>
            <button
              className="btn btn--primary rec__details"
              onClick={() => onOpenDetails(accept.sourceId)}
            >
              Open source details <ArrowIcon width={14} height={14} />
            </button>
          </>
        ) : (
          <>
            <button
              className={`btn ${isError ? "btn--accept" : "btn--accept"}`}
              onClick={onAccept}
              disabled={isAccepting}
            >
              {isAccepting ? "Saving…" : isError ? "Retry accept" : "Accept"}
            </button>
            <button
              className={`btn ${rejected ? "btn--rejected" : "btn--reject"}`}
              onClick={onReject}
              disabled={isAccepting}
            >
              {rejected ? "Rejected" : "Reject"}
            </button>
            <button className="btn btn--alt" onClick={onAlternative}>Alternative</button>
          </>
        )}
      </div>
    </article>
  );
}
