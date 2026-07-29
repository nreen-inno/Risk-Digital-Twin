import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMonitoringObjective } from "../hooks/useMonitoringObjective.js";
import { useMonitoringObjectiveSources } from "../hooks/useMonitoringObjectiveSources.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Toast from "../components/shared/Toast.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import { ObjectiveIcon } from "../lib/icons.jsx";
import ObjectiveSourcesSummary from "../components/monitoring-objectives/ObjectiveSourcesSummary.jsx";
import ObjectiveSourcesTabs from "../components/monitoring-objectives/ObjectiveSourcesTabs.jsx";
import CurrentSourceCard from "../components/monitoring-objectives/CurrentSourceCard.jsx";
import DraftSourceCard from "../components/monitoring-objectives/DraftSourceCard.jsx";
import DisabledSourcesSection from "../components/monitoring-objectives/DisabledSourcesSection.jsx";
import AiSuggestionsPanel from "../components/monitoring-objectives/AiSuggestionsPanel.jsx";
import "../styles/monitoring-workspace.css";

const OBJECTIVES_ROUTE = "/configure/objectives";

/**
 * Monitoring Objective Workspace — the objective is the main object the user
 * opens and manages. Overview + three clearly-separated tabs (Sources in use /
 * Setup in progress / AI suggestions). AI never runs on open.
 */
export default function MonitoringObjectiveWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const objectiveQuery = useMonitoringObjective(id);
  const sources = useMonitoringObjectiveSources(id);

  const [tab, setTab] = useState("in-use");
  const [toast, setToast] = useState("");

  const objective = objectiveQuery.objective;
  const counts = sources.data.counts;

  // Open an existing source in the Source Details workflow. A synthesized
  // "recommendation" gives the overview its fields; backTo returns here.
  const openSource = (source, focus = "overview") => {
    const recommendation = {
      sourceName: source.name,
      provider: source.provider,
      informationNeed: source.informationNeed,
      recommendationType: source.sourceKindLabel,
      availabilityLabel: source.availability,
    };
    const state = {
      recommendation,
      objectiveId: id,
      objectiveName: objective?.name || "",
      backTo: `/monitoring-objectives/${id}`,
      focus,
    };
    try {
      sessionStorage.setItem(`rdt.sourceDetails.${source.id}`, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
    navigate(`/information-sources/${encodeURIComponent(source.id)}`, { state });
  };

  const notWiredYet = () =>
    setToast("Enabling and disabling sources will be available once the backend exposes it.");

  const tabs = [
    { id: "in-use", label: "Sources in use", count: counts.active },
    { id: "setup", label: "Setup in progress", count: counts.draft },
    { id: "ai", label: "AI suggestions" },
  ];

  const renderSourcesError = () => (
    <div className="is-page-pad">
      <ErrorState error={sources.error} onRetry={sources.reload} />
    </div>
  );

  return (
    <div className="app">
      <TopBar />

      <main className="container">
        <section className="wshead surface fade-in">
          <div className="wshead__top">
            <button
              className="adv-head__back"
              onClick={() => navigate(OBJECTIVES_ROUTE)}
              aria-label="Back to monitoring objectives"
            >
              ← Monitoring objectives
            </button>
            <span className="eyebrow">Monitoring objective</span>
          </div>

          <div className="wshead__main">
            <span className="wshead__icon">
              <ObjectiveIcon iconKey={objective?.iconKey || "generic"} width={28} height={28} />
            </span>
            <div className="wshead__body">
              <h1 className="wshead__title">{objective ? objective.name : "Loading objective…"}</h1>
              {objective?.businessQuestion && <p className="wshead__q">{objective.businessQuestion}</p>}
              {objective?.description && <p className="wshead__desc">{objective.description}</p>}

              {objective?.riskFactors?.length > 0 && (
                <div className="wshead__factors">
                  {objective.riskFactors.map((f) => (
                    <span className="factor" key={f}>{f}</span>
                  ))}
                </div>
              )}
            </div>

            <ObjectiveSourcesSummary counts={counts} />
          </div>
        </section>

        <ObjectiveSourcesTabs tabs={tabs} active={tab} onChange={setTab} />

        <div className="wspanel">
          {/* Tab 1 — Sources in use */}
          {tab === "in-use" && (
            sources.status === "loading" ? (
              <LoadingState />
            ) : sources.status === "error" ? (
              renderSourcesError()
            ) : sources.data.active.length === 0 ? (
              <div className="wsempty">
                <h3>No sources in use yet</h3>
                <p>When a source finishes setup it appears here. Add one under “AI suggestions”.</p>
                <button className="btn btn--ghost" onClick={() => setTab("ai")}>Add a source</button>
              </div>
            ) : (
              <div className="msrc-list">
                {sources.data.active.map((s) => (
                  <CurrentSourceCard key={s.id} source={s} onOpen={openSource} onDisable={notWiredYet} />
                ))}
              </div>
            )
          )}

          {/* Tab 2 — Setup in progress */}
          {tab === "setup" && (
            sources.status === "loading" ? (
              <LoadingState />
            ) : sources.status === "error" ? (
              renderSourcesError()
            ) : sources.data.draft.length === 0 ? (
              <div className="wsempty">
                <h3>Nothing in setup</h3>
                <p>Accept an AI suggestion or add a source manually to start setting one up.</p>
                <button className="btn btn--ghost" onClick={() => setTab("ai")}>Ask AI or add a source</button>
              </div>
            ) : (
              <div className="msrc-list">
                {sources.data.draft.map((s) => (
                  <DraftSourceCard key={s.id} source={s} onOpen={openSource} />
                ))}
              </div>
            )
          )}

          {/* Tab 3 — AI suggestions (opt-in) */}
          {tab === "ai" && (
            <AiSuggestionsPanel
              objectiveId={id}
              objectiveName={objective?.name || ""}
              onSourcesChanged={sources.refresh}
              onToast={setToast}
            />
          )}
        </div>

        {sources.status === "ready" && (
          <DisabledSourcesSection
            sources={sources.data.disabled}
            onOpen={openSource}
            onReenable={notWiredYet}
          />
        )}
      </main>

      <Footer />

      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
