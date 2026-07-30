import { useEffect, useMemo, useRef, useState } from "react";
import ReadinessBadge from "../shared/ReadinessBadge.jsx";
import AiLoadingState from "../shared/AiLoadingState.jsx";
import { buildBusinessAccessPayload } from "../../lib/access.js";

const ONBOARDING_INSTRUCTION = `Create a complete one-pass connector onboarding proposal for this source. Use the source identity, its description, linked monitoring objective, the purpose of the Risk Digital Twin, and your own knowledge. Infer public technical capabilities yourself and do not ask the user to research APIs, RSS feeds, documentation, or other publicly discoverable facts. Propose the connection method, authentication, content scope, language, topics, keywords, collection frequency, data fields, processing instructions, and assumptions. Ask no interview questions. The user may optionally request changes after seeing the proposal.`;

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function proposalSections(advice) {
  if (!advice) return [];
  const approach = advice.recommendedApproach || advice.proposal || {};
  const sections = [];

  const rows = [
    ["Connection method", approach.connectionMethod || approach.connectorType],
    ["Authentication", approach.authentication || approach.authenticationType],
    ["Collection frequency", approach.refreshFrequency || approach.frequency],
    ["Language", asList(approach.languages || approach.language).join(", ")],
    ["Content scope", approach.contentScope || approach.scope],
  ].filter(([, value]) => value);
  if (rows.length) sections.push({ title: "Connector configuration", rows });

  const topicItems = asList(approach.topics || advice.topics);
  if (topicItems.length) sections.push({ title: "Topics", items: topicItems });

  const keywordItems = asList(approach.keywords || advice.keywords);
  if (keywordItems.length) sections.push({ title: "Suggested keywords", items: keywordItems });

  const expectedData = asList(approach.expectedData || advice.expectedData);
  if (expectedData.length) sections.push({ title: "Data to collect", items: expectedData });

  const processing = asList(
    approach.processingInstructions || advice.processingInstructions || advice.recommendedProcessing,
  );
  if (processing.length) sections.push({ title: "Risk processing", items: processing });

  const assumptions = [
    ...asList(advice.assumptions),
    ...asList(advice.missingInformation).map((item) => `AI assumption to confirm: ${item}`),
    ...asList(advice.requiredBeforeConnection).map((item) => `Implementation note: ${item}`),
  ];
  if (assumptions.length) sections.push({ title: "Assumptions and implementation notes", items: assumptions });

  return sections;
}

export default function ConnectorOnboardingConversation({
  initial,
  onSaveAndAsk,
  saving,
  advice,
  error,
  onRetry,
}) {
  const [revision, setRevision] = useState("");
  const [history, setHistory] = useState([]);
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = false;
    setRevision("");
    setHistory([]);
  }, [initial]);

  useEffect(() => {
    if (startedRef.current || advice.status !== "idle" || initial === undefined) return;
    startedRef.current = true;
    const existing = String(initial?.notes || "").trim();
    const notes = [existing, ONBOARDING_INSTRUCTION].filter(Boolean).join("\n\n");
    onSaveAndAsk(buildBusinessAccessPayload("unknown", notes));
  }, [initial, advice.status, onSaveAndAsk]);

  const sections = useMemo(() => proposalSections(advice.data), [advice.data]);
  const loading = saving || advice.status === "loading";
  const proposalReady = advice.status === "ready" && advice.data && (
    sections.length > 0 || advice.data.summary || advice.data.recommendedApproach
  );

  const submitRevision = async (event) => {
    event.preventDefault();
    const text = revision.trim();
    if (!text || loading) return;

    setHistory((current) => [...current, text]);
    setRevision("");
    const previous = String(initial?.notes || "").trim();
    const revisionContext = [...history, text]
      .map((item, index) => `Revision ${index + 1}: ${item}`)
      .join("\n");
    const notes = [previous, ONBOARDING_INSTRUCTION, revisionContext].filter(Boolean).join("\n\n");
    await onSaveAndAsk(buildBusinessAccessPayload("unknown", notes));
  };

  return (
    <section className="sd-card surface co-card">
      <div className="co-heading co-heading--main">
        <div>
          <span className="eyebrow">AI source onboarding</span>
          <h2 className="sd-h2">Connector onboarding proposal</h2>
          <p className="sd-muted sd-access-intro">
            AI prepares a complete proposal from the source, monitoring objective and Risk Digital Twin purpose. You can accept it or describe changes in free form.
          </p>
        </div>
        {advice.status === "ready" && advice.data && (
          <ReadinessBadge readiness={proposalReady ? "ready" : advice.data.readiness} />
        )}
      </div>

      {loading && (
        <AiLoadingState
          title="AI is onboarding the source"
          steps={[
            "Understanding the source and monitoring objective",
            "Selecting the most suitable connection method",
            "Defining scope, frequency and filtering",
            "Preparing the connector proposal",
          ]}
        />
      )}

      {advice.status === "error" && (
        <div className="sd-error">
          <p>{error?.isNetwork ? "Couldn’t reach the backend." : "AI could not prepare the onboarding proposal right now."}</p>
          <button className="btn btn--primary" type="button" onClick={onRetry}>Try again</button>
        </div>
      )}

      {advice.status === "ready" && advice.data && (
        <div className="co-proposal-shell fade" aria-live="polite">
          <div className="co-proposal-summary">
            <span className="eyebrow">Proposed onboarding</span>
            <p>{advice.data.summary || "AI has prepared a connector proposal for this source."}</p>
            {advice.data.rationale && <p className="sd-rationale">{advice.data.rationale}</p>}
          </div>

          {sections.map((section) => (
            <section className="co-proposal-section" key={section.title}>
              <h3>{section.title}</h3>
              {section.rows && (
                <div className="co-proposal-grid">
                  {section.rows.map(([label, value]) => (
                    <div className="co-proposal__row" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              )}
              {section.items && (
                <ul className="sd-check-list">
                  {section.items.map((item, index) => <li key={`${section.title}-${index}`}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}

          <div className="co-actions-panel">
            <button
              className="btn btn--primary"
              type="button"
              disabled
              title="Connector generation will be enabled after the backend generation endpoint is implemented"
            >
              Accept and generate connector
            </button>
            <span className="sd-muted">Connector generation is the next backend implementation step.</span>
          </div>

          <form className="co-revision" onSubmit={submitRevision}>
            <label htmlFor="connector-revision">Describe changes</label>
            <p className="sd-muted">
              Optional: correct assumptions, change languages, topics, keywords, frequency or any other part of the proposal. AI will regenerate the complete proposal.
            </p>
            {history.length > 0 && (
              <div className="co-revision-history">
                {history.map((item, index) => (
                  <div key={`${item}-${index}`}><strong>Revision {index + 1}:</strong> {item}</div>
                ))}
              </div>
            )}
            <textarea
              id="connector-revision"
              className="co-textarea"
              rows="4"
              value={revision}
              onChange={(event) => setRevision(event.target.value)}
              placeholder="Example: Use both Finnish and English, poll politics every hour, weather twice a day, and add Wärtsilä and Rauma Marine Constructions as keywords."
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
