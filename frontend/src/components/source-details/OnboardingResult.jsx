import { useState } from "react";
import AiLoadingState from "../shared/AiLoadingState.jsx";
import ReadinessBadge from "../shared/ReadinessBadge.jsx";
import { CheckIcon } from "../../lib/icons.jsx";
import { confidenceLevel } from "../../lib/access.js";

function CheckList({ items }) {
  if (!items || !items.length) return null;
  return (
    <ul className="sd-check-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function Tags({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="sd-tags">
      {items.map((t, i) => <span className="sd-tag" key={i}>{t}</span>)}
    </div>
  );
}

function ConfigGrid({ rows }) {
  const filled = rows.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <div className="op-grid">
      {filled.map(([label, value]) => (
        <div className="op-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

/**
 * Shared structured renderer for both onboarding branches. Reads the normalized
 * connector-advice and lays it out as concise sections a risk manager can read:
 * what AI knows, what it assumes, what is missing, and whether the connector
 * can be generated. `variant` reorders/relabels sections per the spec:
 *   - "ai": Purpose / Information source / Recommended connector / Monitoring /
 *           Available information / AI assumptions / Information that would
 *           improve connector quality / Connector readiness.
 *   - "technical": Available information / AI assumptions / Missing information /
 *           Connector readiness.
 */
export default function OnboardingResult({
  advice,
  variant,
  recommendation,
  accepted,
  onAccept,
  onRefine,
  onRetry,
}) {
  const [revision, setRevision] = useState("");

  if (advice.status === "loading") {
    return (
      <AiLoadingState
        title={variant === "technical" ? "AI is analysing your technical information" : "AI is onboarding the source"}
        steps={
          variant === "technical"
            ? [
                "Reading the technical information you provided",
                "Identifying available details and formats",
                "Inferring assumptions and spotting gaps",
                "Assessing connector readiness",
              ]
            : [
                "Identifying the source and its official access options",
                "Designing monitoring scope and collection frequency",
                "Defining risk filtering, evidence and processing",
                "Preparing an actionable connector proposal",
              ]
        }
      />
    );
  }

  if (advice.status === "error") {
    return (
      <div className="sd-error">
        <p>
          {advice.error?.isNetwork
            ? "Couldn’t reach the backend."
            : advice.error?.isTimeout
            ? "The AI request took too long."
            : "AI could not complete the analysis."}
        </p>
        <button className="btn btn--primary" type="button" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (advice.status !== "ready" || !advice.data) return null;

  const d = advice.data;
  const ra = d.recommendedApproach || {};
  const conf = confidenceLevel(d.confidence);
  const canGenerate = !!d.canGenerateConnectorDefinition;

  const purpose = ra.purpose || d.purpose || recommendation?.informationNeed;
  const languages = (ra.languages || []).join(", ");
  const available = [d.summary].filter(Boolean);

  const submitRevision = (e) => {
    e.preventDefault();
    const text = revision.trim();
    if (text.length < 2) return;
    setRevision("");
    onRefine(text);
  };

  return (
    <div className="op-proposal fade" aria-live="polite">
      <div className="op-head">
        <span className="eyebrow">{variant === "technical" ? "AI analysis" : "AI proposal"}</span>
        <ReadinessBadge readiness={canGenerate ? "ready" : d.readiness || "partiallyReady"} />
      </div>

      {variant === "ai" && (
        <>
          {purpose && (
            <section className="op-section">
              <h3>Purpose</h3>
              <p className="sd-muted">{purpose}</p>
            </section>
          )}
          <section className="op-section">
            <h3>Information source</h3>
            <ConfigGrid rows={[
              ["Source", recommendation?.sourceName],
              ["Provider", recommendation?.provider],
            ]} />
          </section>
          <section className="op-section">
            <h3>Recommended connector</h3>
            <ConfigGrid rows={[
              ["Connector type", ra.connectorType || d.connectorType],
              ["Connection method", ra.connectionMethod],
              ["Authentication", ra.authentication || ra.authenticationType || d.authenticationType],
              ["Collection frequency", ra.refreshFrequency || ra.frequency],
            ]} />
            {ra.rationale && <p className="sd-rationale">{ra.rationale}</p>}
          </section>
          <section className="op-section">
            <h3>Monitoring</h3>
            <ConfigGrid rows={[
              ["Language", languages],
              ["Content scope", ra.contentScope || d.contentScope],
            ]} />
            {ra.topics?.length > 0 && (<><div className="sd-block-h">Topics</div><Tags items={ra.topics} /></>)}
            {ra.keywords?.length > 0 && (<><div className="sd-block-h">Suggested keywords</div><Tags items={ra.keywords} /></>)}
          </section>
        </>
      )}

      <section className="op-section">
        <h3>Available information</h3>
        {available.map((p, i) => <p className="sd-muted" key={i}>{p}</p>)}
        {variant === "technical" && (
          <ConfigGrid rows={[
            ["Connector type", ra.connectorType || d.connectorType],
            ["Connection method", ra.connectionMethod],
            ["Authentication", ra.authentication || ra.authenticationType || d.authenticationType],
            ["Collection frequency", ra.refreshFrequency || ra.frequency],
          ]} />
        )}
        <CheckList items={ra.expectedData || d.expectedData} />
      </section>

      {(d.assumptions?.length > 0) && (
        <section className="op-section">
          <h3>AI assumptions</h3>
          <CheckList items={d.assumptions} />
        </section>
      )}

      {(d.missingInformation?.length > 0 || d.requiredBeforeConnection?.length > 0) && (
        <section className="op-section">
          <h3>{variant === "technical" ? "Missing information" : "Information that would improve connector quality"}</h3>
          <ul className="sd-plain-list sd-plain-list--warn">
            {[...(d.missingInformation || []), ...(d.requiredBeforeConnection || [])].map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>
      )}

      <section className="op-section onb-readiness">
        <h3>Connector readiness</h3>
        <div className="onb-conf">
          <span className="onb-conf__label" style={{ color: conf.tone }}>Confidence: {conf.pct}%</span>
          <span className="onb-conf__bar"><i style={{ width: `${conf.pct}%`, background: conf.tone }} /></span>
        </div>
        <p className={`sd-proceed ${canGenerate ? "sd-proceed--ok" : "sd-proceed--wait"}`}>
          {canGenerate
            ? "Ready — connector generation can begin."
            : "Not ready — additional information is recommended before generating the connector."}
        </p>
      </section>

      <div className="op-accept">
        <div>
          <strong>{accepted ? "Accepted as Connector Specification" : "Proposal ready for review"}</strong>
          <p className="sd-muted">
            {accepted
              ? "This specification is ready for the next stage — connector generation."
              : "Accept it as the connector specification, or describe changes below."}
          </p>
        </div>
        {accepted ? (
          <button className="btn btn--accepted" type="button" disabled>
            <CheckIcon width={14} height={14} /> Accepted
          </button>
        ) : (
          <button
            className="btn btn--primary"
            type="button"
            onClick={onAccept}
            disabled={!canGenerate}
            title={canGenerate ? "" : "Enabled once AI concludes connector generation can begin"}
          >
            Accept as Connector Specification
          </button>
        )}
      </div>

      <form className="op-revision" onSubmit={submitRevision}>
        <label htmlFor="onboarding-revision">Describe changes</label>
        <p className="sd-muted">
          Optional. AI will regenerate the complete {variant === "technical" ? "analysis" : "proposal"} with your correction; no interview is required.
        </p>
        <textarea
          id="onboarding-revision"
          className="op-textarea"
          rows="3"
          value={revision}
          onChange={(e) => setRevision(e.target.value)}
          placeholder={variant === "technical"
            ? "Example: Treat this as an OAuth2 client-credentials API and poll hourly."
            : "Example: Use the Finnish RSS feed, poll hourly, and add Wärtsilä and Baltic logistics to the keywords."}
        />
        <div className="ba-actions">
          <button className="btn btn--secondary" type="submit" disabled={revision.trim().length < 2}>
            Update Analysis
          </button>
        </div>
      </form>
    </div>
  );
}
