import { useState } from "react";
import OnboardingResult from "./OnboardingResult.jsx";
import { buildTechnicalInstruction } from "../../lib/onboarding.js";

const ACCEPT = ".pdf,.docx,.txt,.md,.json,.yaml,.yml,.xml,.csv";
const TEXT_EXT = ["txt", "md", "json", "yaml", "yml", "xml", "csv"];
const MAX_TEXT = 20000;

/**
 * "I already have technical information" branch.
 * Large paste area + optional file attachment, then "Analyse with AI".
 * Text files are read client-side and included; other files (pdf/docx) are
 * referenced by name (UI-only, no backend upload required). AI structures the
 * input into a connector specification. Never asks for secrets.
 */
export default function TechnicalInfoOnboarding({
  recommendation,
  objectiveId,
  advice,
  accepted,
  accepting = false,
  onRun,
  onAccept,
  onChangeMode,
}) {
  const [technicalInfo, setTechnicalInfo] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [revisions, setRevisions] = useState([]);

  const loading = advice.status === "loading";
  const canAnalyse = !loading && (technicalInfo.trim().length > 0 || !!attachment);

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (TEXT_EXT.includes(ext)) {
      const reader = new FileReader();
      reader.onload = () =>
        setAttachment({ name: file.name, type: file.type || ext, text: String(reader.result || "").slice(0, MAX_TEXT) });
      reader.readAsText(file);
    } else {
      setAttachment({ name: file.name, type: file.type || ext, text: "" });
    }
  };

  const run = (revs) =>
    onRun(buildTechnicalInstruction({ recommendation, objectiveId, technicalInfo, attachment, revisions: revs }));

  const analyse = () => {
    if (!canAnalyse) return;
    setRevisions([]);
    run([]);
  };

  const refine = (text) => {
    const next = [...revisions, text];
    setRevisions(next);
    run(next);
  };

  return (
    <section className="sd-card surface op-card">
      <div className="op-head">
        <div>
          <span className="eyebrow">AI source onboarding</span>
          <h2 className="sd-h2">I already have technical information</h2>
          <p className="sd-muted op-intro">
            Paste any technical information you have and AI will analyse it into a connector specification.
          </p>
        </div>
        <button className="onb-change" type="button" onClick={onChangeMode}>Change mode</button>
      </div>

      <div className="onb-input">
        <label htmlFor="tech-info">Technical information</label>
        <textarea
          id="tech-info"
          className="op-textarea onb-tech-area"
          rows="8"
          value={technicalInfo}
          onChange={(e) => setTechnicalInfo(e.target.value)}
          placeholder="Paste API documentation, REST endpoints, Swagger/OpenAPI, JSON, XML, CSV, SQL, an authentication description, technical notes or sample payloads…"
        />
        <p className="ba-helper">
          Provide any technical information you already have. Do not include passwords, API keys or access tokens.
        </p>

        <div className="onb-attach">
          <label className="btn btn--ghost onb-attach__btn">
            <input type="file" accept={ACCEPT} onChange={onFile} hidden />
            Attach file
          </label>
          {attachment ? (
            <span className="onb-attach__file">
              {attachment.name}
              {!attachment.text && " (referenced by name)"}
              <button type="button" className="onb-attach__x" onClick={() => setAttachment(null)} aria-label="Remove file">×</button>
            </span>
          ) : (
            <span className="onb-attach__hint">pdf, docx, txt, md, json, yaml, xml, csv</span>
          )}
        </div>

        <div className="ba-actions">
          {advice.status === "idle" || advice.status === "error" ? (
            <button className="btn btn--primary" type="button" onClick={analyse} disabled={!canAnalyse}>
              Analyse with AI
            </button>
          ) : advice.status === "ready" ? (
            <button
              className="btn btn--ghost"
              type="button"
              onClick={analyse}
              disabled={!canAnalyse || loading}
              title="Discards refinements and runs a fresh analysis from the technical information above"
            >
              Start over
            </button>
          ) : null}
        </div>
        {advice.status === "ready" && (
          <p className="ba-helper">
            To adjust the proposal, use <strong>Describe changes</strong> below. Start over only if you want a fresh analysis.
          </p>
        )}
      </div>

      {advice.status !== "idle" && (
        <OnboardingResult
          advice={advice}
          variant="technical"
          recommendation={recommendation}
          accepted={accepted}
          accepting={accepting}
          onAccept={onAccept}
          onRefine={refine}
          onRetry={() => run(revisions)}
        />
      )}
    </section>
  );
}
