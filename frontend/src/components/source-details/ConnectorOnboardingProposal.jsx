import { useEffect, useMemo, useRef, useState } from "react";
import AiLoadingState from "../shared/AiLoadingState.jsx";
import ReadinessBadge from "../shared/ReadinessBadge.jsx";
import { buildBusinessAccessPayload } from "../../lib/access.js";

const BASE_INSTRUCTION = `You are onboarding an information source into an enterprise Risk Digital Twin.

Produce a complete connector proposal in ONE pass. Do not start an interview and do not ask the user to research publicly discoverable technical facts.

Use all available context: source identity and website, provider, information need, linked monitoring objective, existing source description, the Risk Digital Twin purpose, and your own technical and domain knowledge.

Your job is to make sensible implementation decisions, not return homework to the user. For public sources, infer and propose the best available official feed, API, open-data endpoint, or controlled web extraction method. Prefer official APIs or RSS/Atom feeds over scraping. For enterprise sources, propose the likely connector pattern and clearly label organisation-specific assumptions.

The proposal should be practical for risk monitoring and should specify:
- purpose in this Risk Digital Twin;
- recommended connector type and concrete connection method;
- authentication type (never request secrets at this stage);
- source scope, languages, sections/topics, and useful keywords;
- collection frequency and any escalation frequency;
- fields and evidence to retain;
- deduplication, relevance classification, urgency scoring, summarisation, and mapping to monitoring objectives/risk categories;
- assumptions and implementation notes;
- whether the proposal is ready to accept.

Ask no mandatory follow-up questions. Make reasonable assumptions and expose them for optional correction. The user may accept the proposal or describe changes in free form.`;

function list(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return String(value)
    .split(/\n|•|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function buildInstruction({ recommendation, objectiveId, revisions }) {
  const sourceContext = [
    recommendation?.sourceName && `Source: ${recommendation.sourceName}`,
    recommendation?.provider && `Provider: ${recommendation.provider}`,
    recommendation?.informationNeed && `Information need: ${recommendation.informationNeed}`,
    recommendation?.shortReason && `Why it was selected: ${recommendation.shortReason}`,
    recommendation?.businessValue && `Business value: ${recommendation.businessValue}`,
    objectiveId && `Linked monitoring objective ID: ${objectiveId}`,
  ].filter(Boolean).join("\n");

  const revisionContext = revisions.length
    ? `\n\nUser-requested changes to incorporate into a completely regenerated proposal:\n${revisions
        .map((text, index) => `${index + 1}. ${text}`)
        .join("\n")}`
    : "";

  return [BASE_INSTRUCTION, sourceContext && `\nKnown source context:\n${sourceContext}`, revisionContext]
    .filter(Boolean)
    .join("\n");
}

function normaliseProposal(advice, recommendation) {
  const approach = advice?.recommendedApproach || advice?.proposal || {};
  const expectedData = unique(list(approach.expectedData || advice?.expectedData));
  const assumptions = unique([
    ...list(advice?.assumptions),
    ...list(advice?.missingInformation).map((item) => `Assumption for optional confirmation: ${item}`),
    ...list(advice?.requiredBeforeConnection).map((item) => `Implementation note: ${item}`),
  ]);

  const processing = unique(list(
    approach.processingInstructions || advice?.processingInstructions || advice?.recommendedProcessing
  ));

  return {
    summary: advice?.summary || `Proposed onboarding for ${recommendation?.sourceName || "this source"}.`,
    rationale: approach.rationale || advice?.rationale || "",
    readiness: advice?.canGenerateConnectorDefinition ? "ready" : (advice?.readiness || "partiallyReady"),
    configuration: [
      ["Purpose", approach.purpose || advice?.purpose || recommendation?.informationNeed],
      ["Connector type", approach.connectorType || advice?.connectorType],
      ["Connection method", approach.connectionMethod],
      ["Authentication", approach.authentication || approach.authenticationType || advice?.authenticationType],
      ["Collection frequency", approach.refreshFrequency || approach.frequency],
      ["Language", list(approach.languages || approach.language || advice?.languages).join(", ")],
      ["Content scope", approach.contentScope || approach.scope || advice?.contentScope],
    ].filter(([, value]) => value),
    topics: unique(list(approach.topics || advice?.topics)),
    keywords: unique(list(approach.keywords || advice?.keywords)),
    expectedData,
    processing,
    assumptions,
  };
}

function ItemSection({ title, items }) {
  if (!items.length) return null;
  return (
    <section className="op-section">
      <h3>{title}</h3>
      <ul className="sd-check-list">
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </section>
  );
}

export default function ConnectorOnboardingProposal({
  recommendation,
  objectiveId,
  initialAccess,
  guidanceStatus,
  advice,
  saving,
  onGenerateProposal,
}) {
  const [revision, setRevision] = useState("");
  const [revisions, setRevisions] = useState([]);
  const started = useRef(false);

  useEffect(() => {
    started.current = false;
    setRevision("");
    setRevisions([]);
  }, [recommendation?.sourceName, objectiveId]);

  useEffect(() => {
    if (started.current || guidanceStatus !== "ready" || advice.status !== "idle") return;
    started.current = true;
    const instruction = buildInstruction({ recommendation, objectiveId, revisions: [] });
    onGenerateProposal(buildBusinessAccessPayload("unknown", instruction));
  }, [guidanceStatus, advice.status, recommendation, objectiveId, onGenerateProposal]);

  const proposal = useMemo(
    () => normaliseProposal(advice.data, recommendation),
    [advice.data, recommendation]
  );

  const loading = saving || advice.status === "loading" || guidanceStatus === "loading";

  async function submitRevision(event) {
    event.preventDefault();
    const text = revision.trim();
    if (!text || loading) return;
    const nextRevisions = [...revisions, text];
    setRevisions(nextRevisions);
    setRevision("");
    const instruction = buildInstruction({ recommendation, objectiveId, revisions: nextRevisions });
    await onGenerateProposal(buildBusinessAccessPayload("unknown", instruction));
  }

  function retry() {
    const instruction = buildInstruction({ recommendation, objectiveId, revisions });
    onGenerateProposal(buildBusinessAccessPayload("unknown", instruction));
  }

  return (
    <section className="sd-card surface op-card">
      <div className="op-head">
        <div>
          <span className="eyebrow">AI source onboarding</span>
          <h2 className="sd-h2">Connector proposal</h2>
          <p className="sd-muted op-intro">
            AI proposes the complete setup using the source, monitoring purpose and its own technical knowledge. Review it, accept it, or describe changes.
          </p>
        </div>
        {advice.status === "ready" && <ReadinessBadge readiness={proposal.readiness} />}
      </div>

      {loading && (
        <AiLoadingState
          title="AI is onboarding the source"
          steps={[
            "Identifying the source and its official access options",
            "Designing monitoring scope and collection frequency",
            "Defining risk filtering, evidence and processing",
            "Preparing an actionable connector proposal",
          ]}
        />
      )}

      {advice.status === "error" && !loading && (
        <div className="sd-error">
          <p>
            {advice.error?.isNetwork
              ? "Couldn’t reach the backend."
              : advice.error?.isTimeout
              ? "The AI request took too long."
              : "AI could not prepare the connector proposal."}
          </p>
          <button className="btn btn--primary" type="button" onClick={retry}>Try again</button>
        </div>
      )}

      {advice.status === "ready" && advice.data && !loading && (
        <div className="op-proposal fade" aria-live="polite">
          <section className="op-summary">
            <span className="eyebrow">Proposed onboarding</span>
            <p>{proposal.summary}</p>
            {proposal.rationale && <p className="sd-rationale">{proposal.rationale}</p>}
          </section>

          {proposal.configuration.length > 0 && (
            <section className="op-section">
              <h3>Connector configuration</h3>
              <div className="op-grid">
                {proposal.configuration.map(([label, value]) => (
                  <div className="op-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ItemSection title="Topics" items={proposal.topics} />
          <ItemSection title="Suggested keywords" items={proposal.keywords} />
          <ItemSection title="Data and evidence to retain" items={proposal.expectedData} />
          <ItemSection title="Risk processing" items={proposal.processing} />
          <ItemSection title="Assumptions and implementation notes" items={proposal.assumptions} />

          <div className="op-accept">
            <div>
              <strong>Proposal ready for review</strong>
              <p className="sd-muted">Accept it as the connector specification, or refine it below.</p>
            </div>
            <button
              className="btn btn--primary"
              type="button"
              disabled
              title="This will be enabled when the connector-generation backend endpoint is implemented"
            >
              Accept and generate connector
            </button>
          </div>

          <form className="op-revision" onSubmit={submitRevision}>
            <label htmlFor="onboarding-revision">Describe changes</label>
            <p className="sd-muted">
              Optional. AI will regenerate the complete proposal with your correction; no interview is required.
            </p>
            {revisions.length > 0 && (
              <div className="op-history">
                {revisions.map((item, index) => (
                  <div key={`${item}-${index}`}><strong>Change {index + 1}:</strong> {item}</div>
                ))}
              </div>
            )}
            <textarea
              id="onboarding-revision"
              className="op-textarea"
              rows="4"
              value={revision}
              onChange={(event) => setRevision(event.target.value)}
              placeholder="Example: Monitor both Finnish and English. Poll political news hourly, weather twice daily, and add shipyards, sanctions and Baltic logistics to the keywords."
            />
            <div className="ba-actions">
              <button className="btn btn--secondary" type="submit" disabled={revision.trim().length < 2 || loading}>
                Update proposal with AI
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
