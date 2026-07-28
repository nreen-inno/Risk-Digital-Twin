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

/**
 * AI Connector Advisor — recommended connection approach, effort and what's
 * still missing. No technical config forms, no credentials. Connector
 * Definition generation is a Sprint 4 placeholder.
 */
export default function ConnectorAdvicePanel({ advice, status, error, onGenerate, onRetry }) {
  return (
    <section className="sd-card surface">
      <div className="sd-card__head">
        <span className="eyebrow">AI Connector Advisor</span>
        {status === "ready" && advice && <ReadinessBadge readiness={advice.readiness} />}
      </div>

      {status === "idle" && (
        <div className="sd-connector-intro">
          <p className="sd-muted">
            When you’re ready, the AI can suggest a suitable connection approach,
            the effort involved, and what still needs to be obtained.
          </p>
          <button className="btn btn--primary" onClick={onGenerate}>Get AI connection advice</button>
          <p className="sd-hint-sm">This can take up to a minute.</p>
        </div>
      )}

      {status === "loading" && <AiLoadingState />}

      {status === "error" && (
        <div className="sd-error">
          <p>
            {error && error.isTimeout
              ? "The AI took too long to respond. You can try again."
              : error && error.isNetwork
              ? "Couldn’t reach the backend. Please try again."
              : "Couldn’t generate connection advice right now."}
          </p>
          <button className="btn btn--primary" onClick={onRetry}>Try again</button>
        </div>
      )}

      {status === "ready" && advice && (
        <div className="fade">
          {advice.summary && <p className="sd-guide__summary">{advice.summary}</p>}

          <div className="sd-approach">
            <div className="sd-approach__row">
              <span className="sd-approach__k">Connection method</span>
              <span className="sd-approach__v">{advice.recommendedApproach.connectionMethod || "—"}</span>
            </div>
            <div className="sd-approach__row">
              <span className="sd-approach__k">Refresh frequency</span>
              <span className="sd-approach__v">{advice.recommendedApproach.refreshFrequency || "—"}</span>
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
              <div className="sd-block-h">Required before connecting</div>
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

          <div className="sd-generate">
            {advice.canGenerateConnectorDefinition ? (
              <>
                <button className="btn btn--primary" disabled title="Coming in Sprint 4">
                  Generate Connector Definition – Sprint 4
                </button>
                <span className="sd-hint-sm">Available in the next sprint.</span>
              </>
            ) : (
              <div className="sd-generate__blocked">
                <div className="sd-block-h">Connector generation isn’t available yet</div>
                <p className="sd-muted">
                  Complete the required actions above and obtain the missing
                  information, then connection advice can be regenerated.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
