import { useState } from "react";
import OnboardingResult from "./OnboardingResult.jsx";
import { buildAiInstruction } from "../../lib/onboarding.js";

/**
 * "Let AI analyse the source" branch.
 * No interview and no auto-run: one optional instructions field, then an
 * explicit "Analyse with AI". The selected source is already known, so the
 * source name is never requested. AI returns a full structured proposal.
 */
export default function AiFirstOnboarding({
  recommendation,
  objectiveId,
  advice,
  accepted,
  accepting = false,
  onRun,
  onAccept,
  onChangeMode,
}) {
  const [extra, setExtra] = useState("");
  const [revisions, setRevisions] = useState([]);

  const loading = advice.status === "loading";

  const run = (revs) =>
    onRun(buildAiInstruction({ recommendation, objectiveId, extraInstructions: extra, revisions: revs }));

  const analyse = () => {
    if (loading) return;
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
          <h2 className="sd-h2">Let AI analyse the source</h2>
          <p className="sd-muted op-intro">
            The source is already selected. AI will analyse it and propose the complete connector
            setup using its own technical and domain knowledge. Add optional guidance if you like.
          </p>
        </div>
        <button className="onb-change" type="button" onClick={onChangeMode}>Change mode</button>
      </div>

      <div className="onb-input">
        <label htmlFor="ai-extra">Additional instructions for AI (optional)</label>
        <textarea
          id="ai-extra"
          className="op-textarea"
          rows="3"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="e.g. Monitor only financial news · Use Finnish and English · Check every hour · Focus on suppliers · Prefer official APIs over RSS"
          disabled={loading || advice.status === "ready"}
        />
        <div className="ba-actions">
          {advice.status === "idle" || advice.status === "error" ? (
            <button className="btn btn--primary" type="button" onClick={analyse} disabled={loading}>
              Analyse with AI
            </button>
          ) : advice.status === "ready" ? (
            <button
              className="btn btn--ghost"
              type="button"
              onClick={analyse}
              disabled={loading}
              title="Discards refinements and runs a fresh analysis from the optional instructions above"
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
          variant="ai"
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
