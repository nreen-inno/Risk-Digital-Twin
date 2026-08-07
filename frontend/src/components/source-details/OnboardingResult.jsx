import { useState } from "react";
import AiLoadingState from "../shared/AiLoadingState.jsx";
import { CheckIcon } from "../../lib/icons.jsx";
import { confidenceLevel, readinessStateMeta } from "../../lib/access.js";

function CheckList({ items, warn }) {
  if (!items || !items.length) return null;
  return (
    <ul className={warn ? "sd-plain-list sd-plain-list--warn" : "sd-check-list"}>
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

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function Grid({ rows }) {
  const filled = rows.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <div className="op-grid">
      {filled.map(([label, value]) => (
        <div className="op-row" key={label}>
          <span>{label}</span>
          {isHttpUrl(value) ? (
            <a
              className="op-row__url"
              href={String(value).trim()}
              target="_blank"
              rel="noreferrer"
              title={String(value).trim()}
            >
              {String(value).trim()}
            </a>
          ) : (
            <strong>{value}</strong>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Structured Connector Proposal renderer (onboarding v2).
 * Presents the AI recommendation, technical & monitoring configuration, and —
 * crucially — the three-way classification of uncertainty so nothing reads as
 * "user homework": the automated test verifies technical facts, the risk
 * manager approves business decisions, and only genuinely-undiscoverable public
 * facts are flagged as unresolved. Readiness uses proper states, so a proposal
 * can be accepted for testing before every field is live-validated.
 */
export default function OnboardingResult({ advice, variant, recommendation, accepted, accepting = false, onAccept, onRefine, onRetry }) {
  const [revision, setRevision] = useState("");

  if (advice.status === "loading") {
    return (
      <AiLoadingState
        title={variant === "technical" ? "AI is analysing your technical information" : "AI is preparing the connector proposal"}
        steps={[
          "Resolving official provider, documentation and endpoints",
          "Choosing the connection method and sensible defaults",
          "Proposing monitoring scope, languages and risk mappings",
          "Live-probing RSS/API candidates before you accept",
        ]}
      />
    );
  }

  if (advice.status === "error") {
    return (
      <div className="sd-error">
        <p>
          {advice.error?.isNetwork ? "Couldn’t reach the backend."
            : advice.error?.isTimeout ? "The AI request took too long."
            : "AI could not complete the proposal."}
        </p>
        <button className="btn btn--primary" type="button" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (advice.status !== "ready" || !advice.data) return null;

  const d = advice.data;
  const rec = d.recommendation || {};
  const tc = d.technicalConfiguration || {};
  const mc = d.monitoringConfiguration || {};
  const mp = mc.monitoringProfile || {};
  const rr = d.retentionRecommendation || {};
  const conf = confidenceLevel(d.confidence);
  const state = readinessStateMeta(d.connectorReadiness);

  const retentionRows = [
    typeof rr.storeFeedMetadata === "boolean" && ["Store source metadata", rr.storeFeedMetadata ? "Yes" : "No"],
    typeof rr.storeRawFeedItem === "boolean" && ["Store raw record", rr.storeRawFeedItem ? "Yes" : "No"],
    typeof rr.scrapeFullArticle === "boolean" && ["Scrape full article", rr.scrapeFullArticle ? "Yes" : "No"],
  ].filter(Boolean);

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
        <span className="eyebrow">Connector proposal</span>
        <span className="rd-badge" style={{ color: state.color, background: state.bg, borderColor: state.bd }}>
          <i style={{ background: state.color }} /> {state.label}
        </span>
      </div>

      {d.summary && <p className="sd-muted">{d.summary}</p>}

      {(rec.connectionMethod || rec.rationale) && (
        <section className="op-section">
          <h3>Recommendation</h3>
          <Grid rows={[["Connection method", rec.connectionMethod]]} />
          {rec.rationale && <p className="sd-rationale">{rec.rationale}</p>}
          {rec.alternativeMethods?.length > 0 && (
            <div className="onb-alts">
              {rec.alternativeMethods.map((a, i) => (
                <div className="onb-alt" key={i}>
                  <span className={`onb-alt__tag ${a.status === "recommended" ? "is-ok" : "is-no"}`}>{a.method}</span>
                  <span className="onb-alt__reason">{a.status === "recommended" ? "Alternative" : "Not recommended"}{a.reason ? ` — ${a.reason}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="op-section">
        <h3>Technical configuration</h3>
        <Grid rows={[
          ["Endpoint", tc.endpoint],
          ["Documentation", tc.documentationUrl],
          ["Authentication", tc.authenticationType],
          ["Poll interval", tc.pollInterval],
          ["Response format", tc.responseFormat],
        ]} />
        {d.endpointProbe && (
          <p className={`op-probe ${d.endpointProbe.ok ? "op-probe--ok" : "op-probe--fail"}`}>
            {d.endpointProbe.ok
              ? `Live probe passed before Accept — verified ${d.endpointProbe.endpoint}.`
              : d.endpointProbe.registrationRequired
                ? `Live probe hit a registration wall (${d.endpointProbe.message || "signup required"}). Prefer an official public feed for the demo, or register outside chat and paste only the feed URL — never a password.`
                : `Live probe did not find a working feed yet (${d.endpointProbe.message || "verification failed"}). Accept will retry discovery; refine the endpoint or documentation URL if needed.`}
          </p>
        )}
      </section>

      <section className="op-section">
        <h3>Monitoring configuration</h3>
        <Grid rows={[
          ["Languages", (mc.languages || []).join(", ")],
          ["Geographic scope", (mc.geographicScope || []).join(", ")],
          ["Sensitivity", mc.sensitivity],
        ]} />
        {mc.riskCategoryMappings?.length > 0 && (<><div className="sd-block-h">Risk-category mappings</div><Tags items={mc.riskCategoryMappings} /></>)}
        {mp.includeTerms?.length > 0 && (<><div className="sd-block-h">Include terms</div><Tags items={mp.includeTerms} /></>)}
        {mp.excludeTerms?.length > 0 && (<><div className="sd-block-h">Exclude terms</div><Tags items={mp.excludeTerms} /></>)}
        {mp.entities?.length > 0 && (<><div className="sd-block-h">Entities</div><Tags items={mp.entities} /></>)}
        {mp.locations?.length > 0 && (<><div className="sd-block-h">Locations</div><Tags items={mp.locations} /></>)}
      </section>

      {(retentionRows.length > 0 || rr.reason) && (
        <section className="op-section">
          <h3>Retention</h3>
          <Grid rows={retentionRows} />
          {rr.reason && <p className="sd-rationale">{rr.reason}</p>}
        </section>
      )}

      {d.automatedValidationPlan?.length > 0 && (
        <section className="op-section">
          <h3>Automated validation plan</h3>
          <p className="sd-muted onb-note">The connector test will verify these automatically — nothing for you to do.</p>
          <CheckList items={d.automatedValidationPlan} />
        </section>
      )}

      {d.decisionsRequiringUserApproval?.length > 0 && (
        <section className="op-section onb-decisions">
          <h3>Decisions requiring your approval</h3>
          <p className="sd-muted onb-note">Business choices only you can approve. Accept as-is, or describe changes below.</p>
          <CheckList items={d.decisionsRequiringUserApproval} />
        </section>
      )}

      {d.businessAssumptions?.length > 0 && (
        <section className="op-section">
          <h3>Assumptions</h3>
          <CheckList items={d.businessAssumptions} />
        </section>
      )}

      {d.unresolvedTechnicalFacts?.length > 0 && (
        <section className="op-section">
          <h3>Unresolved technical facts</h3>
          <p className="sd-muted onb-note">Public facts AI could not reliably confirm.</p>
          <CheckList items={d.unresolvedTechnicalFacts} warn />
        </section>
      )}

      <section className="op-section onb-readiness">
        <h3>Connector readiness</h3>
        <div className="onb-conf">
          <span className="onb-conf__label" style={{ color: conf.tone }}>Confidence: {conf.pct}%</span>
          <span className="onb-conf__bar"><i style={{ width: `${conf.pct}%`, background: conf.tone }} /></span>
        </div>
        <p className={`sd-proceed ${state.acceptable ? "sd-proceed--ok" : "sd-proceed--wait"}`}>
          {state.key === "ready-for-activation" ? "Automated test passed — ready for activation."
            : state.key === "ready-for-test" ? "A Connector Specification can be created and automatically tested."
            : state.key === "proposal-ready" ? "Enough information to accept as a specification; the connector test verifies the rest."
            : state.key === "test-failed" ? "The automated test did not pass — review the changes below."
            : "The proposal is still being prepared."}
        </p>
      </section>

      <div className="op-accept">
        <div>
          <strong>{accepted ? "Accepted as Connector Specification" : "Proposal ready for review"}</strong>
          <p className="sd-muted">
            {accepted
              ? "Specification saved. Sample records appear below when the connector test succeeds."
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
            disabled={!state.acceptable || accepting}
            title={state.acceptable ? "" : "Enabled once the proposal is ready"}
          >
            {accepting ? "Verifying feeds…" : "Accept as Connector Specification"}
          </button>
        )}
      </div>

      <form className="op-revision" onSubmit={submitRevision}>
        <label htmlFor="onboarding-revision">Describe changes</label>
        <p className="sd-muted">
          Approve or change any open decisions (languages, scope, sensitivity, etc.). AI regenerates the proposal and should stop re-asking for what you just decided.
        </p>
        <textarea
          id="onboarding-revision"
          className="op-textarea"
          rows="3"
          value={revision}
          onChange={(e) => setRevision(e.target.value)}
          placeholder="Example: Approve Finnish and English; poll every 6 hours; keep sensitivity balanced; add Wärtsilä to the monitoring profile."
        />
        <div className="ba-actions">
          <button className="btn btn--secondary" type="submit" disabled={revision.trim().length < 2}>
            Update proposal with AI
          </button>
        </div>
      </form>
    </div>
  );
}
