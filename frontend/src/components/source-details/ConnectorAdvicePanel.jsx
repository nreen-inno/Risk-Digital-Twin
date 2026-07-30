import { useState } from "react";
import ReadinessBadge from "../shared/ReadinessBadge.jsx";
import ComplexityBadge from "../shared/ComplexityBadge.jsx";
import AiLoadingState from "../shared/AiLoadingState.jsx";
import { confidenceLevel } from "../../lib/access.js";

function Collapsible({ title, items, warn }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;
  return (
    <div className="sd-collapse">
      <button className="sd-collapse__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {title} <span className="sd-collapse__n">{items.length}</span>
        <span className={`rec__chev ${open ? "up" : ""}`}>⌄</span>
      </button>
      {open && (
        <ul className={`sd-plain-list fade ${warn ? "sd-plain-list--warn" : ""}`}>
          {items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
    </div>
  );
}

function ConfidenceMeter({ confidence }) {
  const c = confidenceLevel(confidence);
  return (
    <div className="sd-conf" title={`AI confidence: ${c.pct}%`}>
      <span className="sd-conf__label" style={{ color: c.tone }}>{c.label}</span>
      <span className="sd-conf__bar"><i style={{ width: `${c.pct}%`, background: c.tone }} /></span>
    </div>
  );
}

export default function ConnectorAdvicePanel({ mode = "assessment", advice, status, error, onRetry }) {
  const isAdvisor = mode === "advisor";
  const heading = isAdvisor ? "AI Connector Advisor" : "Access Assessment";

  return (
    <section className="sd-card surface">
      <div className="sd-card__head">
        <span className="eyebrow">{heading}</span>
        {status === "ready" && advice && <ReadinessBadge readiness={advice.readiness} />}
      </div>

      {status === "loading" && (
        <AiLoadingState
          title={isAdvisor ? "Preparing access guidance" : "Analysing access information"}
        />
      )}

      {status === "error" && (
        <div className="sd-error">
          <p>
            {error && error.isTimeout
              ? "The AI took too long to respond. You can try again."
              : error && error.isNetwork
              ? "Couldn’t reach the backend. Please try again."
              : isAdvisor
              ? "Couldn’t prepare access guidance right now."
              : "Couldn’t analyse the access information right now."}
          </p>
          <button className="btn btn--primary" onClick={onRetry}>Try again</button>
        </div>
      )}

      {status === "ready" && advice && (
        <div className="fade">
          {isAdvisor && (
            <p className="sd-mode-explainer">
              Use this guidance to ask the source owner or provider for the missing
              technical information. When technical access becomes available, return to this source
              and select Yes.
            </p>
          )}

          {!isAdvisor && (
            <p className="sd-mode-explainer">
              AI has reviewed the information you supplied and assessed whether the
              source is ready for connector generation.
            </p>
          )}

          {advice.summary && <p className="sd-guide__summary">{advice.summary}</p>}

          <div className="sd-approach">
            <div className="sd-approach__row">
              <span className="sd-approach__k">Connection method</span>
              <span className="sd-approach__v">{advice.recommendedApproach.connectionMethod || "Not identified yet"}</span>
            </div>
            <div className="sd-approach__row">
              <span className="sd-approach__k">Refresh frequency</span>
              <span className="sd-approach__v">{advice.recommendedApproach.refreshFrequency || "Not identified yet"}</span>
            </div>
          </div>

          {advice.recommendedApproach.expectedData.length > 0 && (
            <div className="sd-actions-block">
              <div className="sd-block-h">Expected data</div>
              <div className="sd-tags">
                {advice.recommendedApproach.expectedData.map((d, i) => (
                  <span className="sd-tag" key={i}>{d}</span>
                ))}
              </div>
            </div>
          )}

          {advice.recommendedApproach.rationale && (
            <p className="sd-rationale">{advice.recommendedApproach.rationale}</p>
          )}

          {advice.requiredBeforeConnection.length > 0 && (
            <div className="sd-actions-block">
              <div className="sd-block-h">
                {isAdvisor ? "Ask the owner or provider for" : "Required before connector generation"}
              </div>
              <ul className="sd-check-list">
                {advice.requiredBeforeConnection.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <Collapsible title="Missing information" items={advice.missingInformation} warn />
          <Collapsible title="Assumptions" items={advice.assumptions} />

          <div className="sd-advice-foot">
            <ComplexityBadge complexity={advice.estimatedComplexity} />
            <ConfidenceMeter confidence={advice.confidence} />
          </div>

          {!isAdvisor && (
            <div className="sd-generate">
              {advice.canGenerateConnectorDefinition ? (
                <div className="sd-ready-box">
                  <div>
                    <div className="sd-ready-box__title">Enough information is available</div>
                    <p className="sd-muted">Connector generation can begin in the next step.</p>
                  </div>
                  <button className="btn btn--primary" disabled title="Connector generation is the next implementation step">
                    Generate Connector
                  </button>
                </div>
              ) : (
                <div className="sd-generate__blocked">
                  <div className="sd-block-h">More information is needed</div>
                  <p className="sd-muted">
                    Add the missing information to the form above and run the assessment again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
