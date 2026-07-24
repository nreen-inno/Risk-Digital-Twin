import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMonitoringObjective } from "../hooks/useMonitoringObjective.js";
import { useSourceRecommendations } from "../hooks/useSourceRecommendations.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import AiThinking from "../components/shared/AiThinking.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import Toast from "../components/shared/Toast.jsx";
import { ObjectiveIcon } from "../lib/icons.jsx";
import CoverageSection from "../components/source-advisor/CoverageSection.jsx";
import RecommendationSection from "../components/source-advisor/RecommendationSection.jsx";
import SummaryPanel from "../components/source-advisor/SummaryPanel.jsx";
import "../styles/source-advisor.css";

const OBJECTIVES_ROUTE = "/configure/objectives";
const storageKey = (id) => `rdt.sourceDecisions.${id}`;

function readStored(id) {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Source Advisor — second page of the Configure workflow.
 * The objective context is loaded for the header/summary; the AI advisor
 * assessment (coverage + recommendations) is loaded and rendered dynamically.
 * Accept / Reject decisions are held in state and sessionStorage. No save.
 */
export default function SourceAdvisorPage() {
  const { objectiveId } = useParams();
  const navigate = useNavigate();

  const objectiveQuery = useMonitoringObjective(objectiveId);
  const advisor = useSourceRecommendations(objectiveId);

  const [decisions, setDecisions] = useState(() => readStored(objectiveId));
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(objectiveId), JSON.stringify(decisions));
    } catch {
      /* storage unavailable — decisions still live in React state */
    }
  }, [decisions, objectiveId]);

  const setDecision = (id, value) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (next[id] === value) delete next[id];
      else next[id] = value;
      return next;
    });

  const accepted = useMemo(
    () => Object.values(decisions).filter((v) => v === "accepted").length,
    [decisions]
  );
  const rejected = useMemo(
    () => Object.values(decisions).filter((v) => v === "rejected").length,
    [decisions]
  );

  const objective = objectiveQuery.objective;
  const data = advisor.data;
  const goBack = () => navigate(OBJECTIVES_ROUTE);

  return (
    <div className="app">
      <TopBar />

      <main className="container">
        {/* Objective context header */}
        <section className="adv-head surface fade-in">
          <div className="adv-head__top">
            <button className="adv-head__back" onClick={goBack} aria-label="Back to monitoring objectives">
              ← Objectives
            </button>
            <span className="eyebrow">Step 2 · AI Source Advisor</span>
          </div>
          <div className="adv-head__main">
            <span className="adv-head__icon">
              <ObjectiveIcon iconKey={objective?.iconKey || "generic"} width={26} height={26} />
            </span>
            <div>
              <h1 className="adv-head__title">
                {objective ? objective.name : "Loading objective…"}
              </h1>
              {objective?.businessQuestion && (
                <p className="adv-head__q">{objective.businessQuestion}</p>
              )}
            </div>
          </div>
        </section>

        {/* Advisor body */}
        {advisor.status === "loading" && <AiThinking />}

        {advisor.status === "error" && (
          <div className="is-page-pad">
            {advisor.error?.status === 404 ? (
              <div className="state">
                <h3>Advisor not available yet</h3>
                <p>
                  The AI Source Advisor endpoint isn’t responding for this
                  objective yet. Once the backend exposes it, recommendations
                  will appear here automatically.
                </p>
                <button className="btn btn--primary" onClick={advisor.reload}>Retry</button>
              </div>
            ) : (
              <ErrorState error={advisor.error} onRetry={advisor.reload} />
            )}
          </div>
        )}

        {advisor.status === "ready" && data && (
          <>
            <CoverageSection summary={data.summary} needs={data.needs} counts={data.coverageCounts} />

            <RecommendationSection
              recommendations={data.recommendations}
              decisions={decisions}
              onAccept={(id) => setDecision(id, "accepted")}
              onReject={(id) => setDecision(id, "rejected")}
              onAlternative={(rec) =>
                setToast(`Alternative sources for "${rec.sourceName}" are coming in a later sprint.`)
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

            <SummaryPanel
              objectiveName={objective ? objective.name : "This objective"}
              coverageCounts={data.coverageCounts}
              acceptedCount={accepted}
              rejectedCount={rejected}
              canContinue={accepted > 0}
              onBack={goBack}
              onContinue={() =>
                setToast("Connector analysis will be implemented in the next sprint.")
              }
            />
          </>
        )}
      </main>

      <Footer />

      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
