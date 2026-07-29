import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSourceRecommendations, acceptRecommendation } from "../../services/api.js";
import AiThinking from "../shared/AiThinking.jsx";
import CoverageSection from "../source-advisor/CoverageSection.jsx";
import RecommendationSection from "../source-advisor/RecommendationSection.jsx";
import { SparkIcon } from "../../lib/icons.jsx";
import AddSourceMenu from "./AddSourceMenu.jsx";
import "../../styles/source-advisor.css";

/**
 * Tab 3 — AI suggestions. AI is OPTIONAL and never runs on open: the advisor is
 * only called after the user clicks "Ask AI for suggestions". Accepting a
 * suggestion persists it as an Information Source (Setup in progress) and asks
 * the workspace to refresh. Rejection is local-only for this sprint.
 * "Add source manually" lives here too and does not invoke AI.
 */
export default function AiSuggestionsPanel({ objectiveId, objectiveName, onSourcesChanged, onToast }) {
  const navigate = useNavigate();
  const [ai, setAi] = useState({ status: "idle", data: null, error: null });
  const [accepts, setAccepts] = useState({});
  const [decisions, setDecisions] = useState({}); // local reject / decide-later state

  const askAi = async () => {
    setAi({ status: "loading", data: null, error: null });
    try {
      const data = await getSourceRecommendations(objectiveId);
      setAi({ status: "ready", data, error: null });
    } catch (err) {
      setAi({ status: "error", data: null, error: err });
    }
  };

  const persistContext = (rec, sourceId) => {
    try {
      sessionStorage.setItem(
        `rdt.sourceDetails.${sourceId}`,
        JSON.stringify({
          recommendation: rec,
          objectiveId,
          objectiveName,
          backTo: `/monitoring-objectives/${objectiveId}`,
        })
      );
    } catch {
      /* storage unavailable */
    }
  };

  const handleAccept = async (rec) => {
    setDecisions((prev) => {
      if (prev[rec.id] !== "rejected") return prev;
      const next = { ...prev };
      delete next[rec.id];
      return next;
    });
    setAccepts((prev) => ({ ...prev, [rec.id]: { status: "accepting" } }));
    try {
      const res = await acceptRecommendation(objectiveId, rec);
      if (!res.ok || !res.id) throw new Error("The backend did not return an information source id.");
      setAccepts((prev) => ({
        ...prev,
        [rec.id]: { status: "accepted", sourceId: res.id, duplicate: res.duplicate },
      }));
      persistContext(rec, res.id);
      onToast(
        res.duplicate
          ? "Already saved — it's in Setup in progress."
          : "Saved to Setup in progress."
      );
      onSourcesChanged(); // refresh active/draft so it appears under Setup in progress
    } catch (err) {
      setAccepts((prev) => ({ ...prev, [rec.id]: { status: "error", error: err } }));
      onToast(
        err && err.isNetwork
          ? "Couldn't reach the backend. Please try again."
          : "Couldn't save this suggestion. Please try again."
      );
    }
  };

  const openDetails = (rec, sourceId) => {
    persistContext(rec, sourceId);
    navigate(`/information-sources/${encodeURIComponent(sourceId)}`, {
      state: {
        recommendation: rec,
        objectiveId,
        objectiveName,
        backTo: `/monitoring-objectives/${objectiveId}`,
      },
    });
  };

  // "Decide later" = leave it undecided (neutral). Reject toggles local state.
  const setReject = (id) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (next[id] === "rejected") delete next[id];
      else next[id] = "rejected";
      return next;
    });

  const data = ai.data;

  return (
    <div className="mai">
      {ai.status === "idle" && (
        <div className="mai__intro">
          <span className="mai__spark"><SparkIcon width={22} height={22} /></span>
          <h3 className="mai__h">Need additional monitoring coverage?</h3>
          <p className="mai__p">
            Ask AI to analyse gaps and recommend relevant information sources for this
            objective. AI is optional — your current sources keep working without it.
          </p>
          <div className="mai__actions">
            <button className="btn btn--primary" onClick={askAi}>
              <SparkIcon width={15} height={15} /> Ask AI for suggestions
            </button>
            <AddSourceMenu objectiveId={objectiveId} onAdded={() => { onToast("Source added to Setup in progress."); onSourcesChanged(); }} />
          </div>
        </div>
      )}

      {ai.status === "loading" && (
        <AiThinking title="AI Source Advisor is analysing" fullscreen={false} />
      )}

      {ai.status === "error" && (
        <div className="mai__error">
          <p>
            {ai.error?.status === 404
              ? "The AI Source Advisor isn't available for this objective yet."
              : ai.error?.isNetwork
              ? "Couldn't reach the backend. Please try again."
              : "Couldn't generate suggestions right now."}
          </p>
          <button className="btn btn--primary" onClick={askAi}>Try again</button>
        </div>
      )}

      {ai.status === "ready" && data && (
        <div className="fade">
          <div className="mai__bar">
            <span className="mai__count">
              {data.recommendations.length} AI suggestion{data.recommendations.length === 1 ? "" : "s"}
            </span>
            <AddSourceMenu objectiveId={objectiveId} onAdded={() => { onToast("Source added to Setup in progress."); onSourcesChanged(); }} />
          </div>

          <p className="mai__cov-note">
            The assessment below reflects <strong>current monitoring coverage by information
            need</strong> — not recommendation quality.
          </p>
          <CoverageSection summary={data.summary} needs={data.needs} counts={data.coverageCounts} />

          <RecommendationSection
            recommendations={data.recommendations}
            decisions={decisions}
            accepts={accepts}
            onAccept={handleAccept}
            onOpenDetails={openDetails}
            onReject={setReject}
            onAlternative={(rec) =>
              onToast(`A public alternative for "${rec.sourceName}" is coming in a later sprint.`)
            }
          />

          {data.assumptions.length > 0 && (
            <section className="adv-assump">
              <div className="adv-assump__h">Advisor assumptions</div>
              <ul>
                {data.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
