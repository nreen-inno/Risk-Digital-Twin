import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMonitoringObjective } from "../hooks/useMonitoringObjective.js";
import { useSourceRecommendations } from "../hooks/useSourceRecommendations.js";
import { acceptRecommendation } from "../services/api.js";
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
const decisionsKey = (id) => `rdt.sourceDecisions.${id}`;
const acceptsKey = (id) => `rdt.accepts.${id}`;
const detailsKey = (id) => `rdt.sourceDetails.${id}`;

function readStored(key) {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Source Advisor — second page of the Configure workflow.
 * Coverage + prioritised recommendations. Accepting a recommendation now
 * persists it as an Information Source (Sprint 3) and unlocks its details.
 */
export default function SourceAdvisorPage() {
  const { objectiveId } = useParams();
  const navigate = useNavigate();

  const objectiveQuery = useMonitoringObjective(objectiveId);
  const advisor = useSourceRecommendations(objectiveId);

  const [decisions, setDecisions] = useState(() => readStored(decisionsKey(objectiveId)));
  const [accepts, setAccepts] = useState(() => readStored(acceptsKey(objectiveId)));
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      sessionStorage.setItem(decisionsKey(objectiveId), JSON.stringify(decisions));
    } catch {
      /* storage unavailable */
    }
  }, [decisions, objectiveId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(acceptsKey(objectiveId), JSON.stringify(accepts));
    } catch {
      /* storage unavailable */
    }
  }, [accepts, objectiveId]);

  const setReject = (id) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (next[id] === "rejected") delete next[id];
      else next[id] = "rejected";
      return next;
    });

  const objective = objectiveQuery.objective;

  const handleAccept = async (rec) => {
    // Clear any prior reject; mark accepting.
    setDecisions((prev) => {
      if (prev[rec.id] !== "rejected") return prev;
      const next = { ...prev };
      delete next[rec.id];
      return next;
    });
    setAccepts((prev) => ({ ...prev, [rec.id]: { status: "accepting" } }));
    try {
      const res = await acceptRecommendation(objectiveId, rec);
      if (!res.ok || !res.id) {
        throw new Error("The backend did not return an information source id.");
      }
      setAccepts((prev) => ({
        ...prev,
        [rec.id]: { status: "accepted", sourceId: res.id, duplicate: res.duplicate },
      }));
      // Persist context so the details page has the overview after a refresh.
      try {
        sessionStorage.setItem(
          detailsKey(res.id),
          JSON.stringify({ recommendation: rec, objectiveId, objectiveName: objective?.name || "" })
        );
      } catch {
        /* storage unavailable */
      }
      setToast(
        res.duplicate
          ? "Already saved as an Information Source — open its details to continue."
          : "Saved as an Information Source. Open its details to continue."
      );
    } catch (err) {
      setAccepts((prev) => ({ ...prev, [rec.id]: { status: "error", error: err } }));
      setToast(
        err && err.isNetwork
          ? "Couldn’t reach the backend. Please try again."
          : "Couldn’t save this recommendation. Please try again."
      );
    }
  };

  const openDetails = (rec, sourceId) => {
    try {
      sessionStorage.setItem(
        detailsKey(sourceId),
        JSON.stringify({ recommendation: rec, objectiveId, objectiveName: objective?.name || "" })
      );
    } catch {
      /* ignore */
    }
    navigate(`/information-sources/${encodeURIComponent(sourceId)}`, {
      state: { recommendation: rec, objectiveId, objectiveName: objective?.name || "" },
    });
  };

  const acceptedCount = useMemo(
    () => Object.values(accepts).filter((a) => a && a.status === "accepted").length,
    [accepts]
  );
  const rejectedCount = useMemo(
    () => Object.values(decisions).filter((v) => v === "rejected").length,
    [decisions]
  );

  const data = advisor.data;
  const goBack = () => navigate(OBJECTIVES_ROUTE);

  return (
    <div className="app">
      <TopBar />

      <main className="container">
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
              accepts={accepts}
              onAccept={handleAccept}
              onOpenDetails={openDetails}
              onReject={setReject}
              onAlternative={(rec) =>
                setToast(`A public alternative for "${rec.sourceName}" is coming in a later sprint.`)
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
              acceptedCount={acceptedCount}
              rejectedCount={rejectedCount}
              canContinue={acceptedCount > 0}
              onBack={goBack}
              onContinue={() =>
                setToast("Open an accepted source’s details to review access and connector advice.")
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
