import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSourceRecommendations, acceptRecommendation } from "../../services/api.js";
import AiThinking from "../shared/AiThinking.jsx";
import CoverageSection from "../source-advisor/CoverageSection.jsx";
import RecommendationSection from "../source-advisor/RecommendationSection.jsx";
import { SparkIcon } from "../../lib/icons.jsx";
import "../../styles/source-advisor.css";

export default function AiSuggestionsPanel({ objectiveId, objectiveName, onSourcesChanged, onToast, startToken = 0 }) {
  const navigate = useNavigate();
  const [ai, setAi] = useState({ status: "idle", data: null, error: null });
  const [accepts, setAccepts] = useState({});
  const [decisions, setDecisions] = useState({});

  const askAi = async () => {
    setAi({ status: "loading", data: null, error: null });
    try {
      const data = await getSourceRecommendations(objectiveId);
      setAi({ status: "ready", data, error: null });
    } catch (err) {
      setAi({ status: "error", data: null, error: err });
    }
  };

  useEffect(() => {
    if (startToken > 0 && ai.status === "idle") askAi();
    // startToken is an explicit user action from Add source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startToken]);

  const persistContext = (rec, sourceId) => {
    try {
      sessionStorage.setItem(
        `rdt.sourceDetails.${sourceId}`,
        JSON.stringify({ recommendation: rec, objectiveId, objectiveName, backTo: `/monitoring-objectives/${objectiveId}` })
      );
      sessionStorage.setItem(
        `rdt.sourceOnboarding.${sourceId}`,
        JSON.stringify({ reason: "Accepted AI recommendation" })
      );
    } catch {
      /* storage unavailable */
    }
  };

  const handleAccept = async (rec) => {
    setDecisions((previous) => {
      if (previous[rec.id] !== "rejected") return previous;
      const next = { ...previous };
      delete next[rec.id];
      return next;
    });
    setAccepts((previous) => ({ ...previous, [rec.id]: { status: "accepting" } }));
    try {
      const result = await acceptRecommendation(objectiveId, rec);
      if (!result.ok || !result.id) throw new Error("The backend did not return an information source id.");
      setAccepts((previous) => ({ ...previous, [rec.id]: { status: "accepted", sourceId: result.id, duplicate: result.duplicate } }));
      persistContext(rec, result.id);
      onToast(result.duplicate ? "Already added to Source onboarding." : "Added to Source onboarding.");
      onSourcesChanged();
    } catch (err) {
      setAccepts((previous) => ({ ...previous, [rec.id]: { status: "error", error: err } }));
      onToast(err?.isNetwork ? "Couldn’t reach the backend. Please try again." : "Couldn’t save this suggestion. Please try again.");
    }
  };

  const openDetails = (rec, sourceId) => {
    persistContext(rec, sourceId);
    navigate(`/information-sources/${encodeURIComponent(sourceId)}`, {
      state: { recommendation: rec, objectiveId, objectiveName, backTo: `/monitoring-objectives/${objectiveId}` },
    });
  };

  const setReject = (id) => setDecisions((previous) => {
    const next = { ...previous };
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
          <h3 className="mai__h">Ask AI to recommend sources</h3>
          <p className="mai__p">
            Use this path when you do not yet know which internal or external sources could support the monitoring objective.
          </p>
          <button className="btn btn--primary" onClick={askAi}>
            <SparkIcon width={15} height={15} /> Analyse and recommend sources
          </button>
        </div>
      )}

      {ai.status === "loading" && <AiThinking title="AI Source Advisor is analysing" fullscreen={false} />}

      {ai.status === "error" && (
        <div className="mai__error">
          <p>{ai.error?.isNetwork ? "Couldn’t reach the backend. Please try again." : "Couldn’t generate suggestions right now."}</p>
          <button className="btn btn--primary" onClick={askAi}>Try again</button>
        </div>
      )}

      {ai.status === "ready" && data && (
        <div className="fade">
          <div className="mai__bar">
            <span className="mai__count">{data.recommendations.length} AI suggestion{data.recommendations.length === 1 ? "" : "s"}</span>
            <button className="btn btn--ghost" onClick={askAi}>Run analysis again</button>
          </div>

          <p className="mai__cov-note">
            The assessment reflects <strong>current monitoring coverage by information need</strong>. Select the recommendations you want to move into Source onboarding.
          </p>
          <CoverageSection summary={data.summary} needs={data.needs} counts={data.coverageCounts} />

          <RecommendationSection
            recommendations={data.recommendations}
            decisions={decisions}
            accepts={accepts}
            onAccept={handleAccept}
            onOpenDetails={openDetails}
            onReject={setReject}
            onAlternative={(rec) => onToast(`A public alternative for "${rec.sourceName}" is coming in a later sprint.`)}
          />

          {data.assumptions.length > 0 && (
            <section className="adv-assump">
              <div className="adv-assump__h">Advisor assumptions</div>
              <ul>{data.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
