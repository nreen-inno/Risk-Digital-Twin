import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMonitoringObjective } from "../hooks/useMonitoringObjective.js";
import { useMonitoringObjectiveSources } from "../hooks/useMonitoringObjectiveSources.js";
import { updateInformationSourceStatus } from "../services/api.js";
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
import AddSourceMenu from "../components/monitoring-objectives/AddSourceMenu.jsx";
import "../styles/monitoring-workspace.css";

const OBJECTIVES_ROUTE = "/configure/objectives";

function readOnboardingReason(sourceId) {
  try {
    const raw = sessionStorage.getItem(`rdt.sourceOnboarding.${sourceId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.reason || "";
  } catch {
    return "";
  }
}

function saveOnboardingReason(sourceId, reason, extra = {}) {
  try {
    const raw = sessionStorage.getItem(`rdt.sourceOnboarding.${sourceId}`);
    const previous = raw ? JSON.parse(raw) : {};
    sessionStorage.setItem(
      `rdt.sourceOnboarding.${sourceId}`,
      JSON.stringify({ ...previous, ...extra, reason })
    );
  } catch {
    /* storage unavailable */
  }
}

export default function MonitoringObjectiveWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const objectiveQuery = useMonitoringObjective(id);
  const sources = useMonitoringObjectiveSources(id);

  const [tab, setTab] = useState("in-use");
  const [toast, setToast] = useState("");
  const [aiStartToken, setAiStartToken] = useState(0);
  const [modifySource, setModifySource] = useState(null);
  const [modifyReason, setModifyReason] = useState("");
  const [busySourceId, setBusySourceId] = useState("");

  const objective = objectiveQuery.objective;
  const counts = sources.data.counts;

  const openSource = (source) => {
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
    };
    try {
      sessionStorage.setItem(`rdt.sourceDetails.${source.id}`, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
    navigate(`/information-sources/${encodeURIComponent(source.id)}`, { state });
  };

  const changeStatus = async (source, status, successMessage) => {
    setBusySourceId(source.id);
    try {
      await updateInformationSourceStatus(source.id, status);
      await sources.refresh();
      setToast(successMessage);
    } catch (error) {
      setToast(error?.isNetwork ? "Couldn’t reach the backend." : "Couldn’t update the source status.");
    } finally {
      setBusySourceId("");
    }
  };

  const disableSource = (source) => {
    if (!window.confirm(`Disable “${source.name}”? It will stop being used for this monitoring objective.`)) return;
    changeStatus(source, "disabled", "Source disabled.");
  };

  const startModify = (source) => {
    setModifySource(source);
    setModifyReason("");
  };

  const confirmModify = async () => {
    if (!modifySource || !modifyReason.trim()) return;
    saveOnboardingReason(modifySource.id, modifyReason.trim(), { reasonType: "modification" });
    const source = modifySource;
    setModifySource(null);
    setModifyReason("");
    await changeStatus(source, "draft", "Source moved to onboarding for modification.");
    setTab("onboarding");
  };

  const removeFromOnboarding = (source) => {
    if (!window.confirm(`Remove “${source.name}” from onboarding? It will be moved to Disabled sources.`)) return;
    changeStatus(source, "disabled", "Source removed from onboarding.");
  };

  const restoreSource = async (source) => {
    saveOnboardingReason(source.id, "Source restored for onboarding", { reasonType: "restore" });
    await changeStatus(source, "draft", "Source restored to onboarding.");
    setTab("onboarding");
  };

  const tabs = [
    { id: "in-use", label: "Sources in use", count: counts.active },
    { id: "onboarding", label: "Source onboarding", count: counts.draft },
    { id: "ai", label: "AI recommendations" },
  ];

  const renderSourcesError = () => (
    <div className="is-page-pad"><ErrorState error={sources.error} onRetry={sources.reload} /></div>
  );

  return (
    <div className="app">
      <TopBar />

      <main className="container">
        <section className="wshead surface fade-in">
          <div className="wshead__top">
            <button className="adv-head__back" onClick={() => navigate(OBJECTIVES_ROUTE)} aria-label="Back to monitoring objectives">
              ← Monitoring objectives
            </button>
            <span className="eyebrow">Monitoring objective</span>
          </div>

          <div className="wshead__main">
            <span className="wshead__icon"><ObjectiveIcon iconKey={objective?.iconKey || "generic"} width={28} height={28} /></span>
            <div className="wshead__body">
              <h1 className="wshead__title">{objective ? objective.name : "Loading objective…"}</h1>
              {objective?.businessQuestion && <p className="wshead__q">{objective.businessQuestion}</p>}
              {objective?.description && <p className="wshead__desc">{objective.description}</p>}
              {objective?.riskFactors?.length > 0 && (
                <div className="wshead__factors">
                  {objective.riskFactors.map((factor) => <span className="factor" key={factor}>{factor}</span>)}
                </div>
              )}
            </div>
            <ObjectiveSourcesSummary counts={counts} />
          </div>
        </section>

        <div className="wsactions">
          <div>
            <h2>Monitoring sources</h2>
            <p>Add a source you already know, or ask AI to recommend possible sources.</p>
          </div>
          <AddSourceMenu
            objectiveId={id}
            onAdded={async () => {
              await sources.refresh();
              setTab("onboarding");
              setToast("Source added to onboarding.");
            }}
            onAskAi={() => {
              setTab("ai");
              setAiStartToken((value) => value + 1);
            }}
          />
        </div>

        <ObjectiveSourcesTabs tabs={tabs} active={tab} onChange={setTab} />

        <div className="wspanel">
          {tab === "in-use" && (
            sources.status === "loading" ? <LoadingState /> :
            sources.status === "error" ? renderSourcesError() :
            sources.data.active.length === 0 ? (
              <div className="wsempty">
                <h3>No sources in use yet</h3>
                <p>Add a known source or ask AI for recommendations. New sources first appear in Source onboarding.</p>
              </div>
            ) : (
              <div className="msrc-list">
                {sources.data.active.map((source) => (
                  <CurrentSourceCard
                    key={source.id}
                    source={source}
                    onView={openSource}
                    onModify={startModify}
                    onDisable={disableSource}
                    busy={busySourceId === source.id}
                  />
                ))}
              </div>
            )
          )}

          {tab === "onboarding" && (
            sources.status === "loading" ? <LoadingState /> :
            sources.status === "error" ? renderSourcesError() :
            sources.data.draft.length === 0 ? (
              <div className="wsempty">
                <h3>No sources in onboarding</h3>
                <p>Sources appear here after you add one, accept an AI recommendation, restore a source or request a modification.</p>
              </div>
            ) : (
              <div className="msrc-list">
                {sources.data.draft.map((source) => (
                  <DraftSourceCard
                    key={source.id}
                    source={source}
                    onboardingReason={readOnboardingReason(source.id)}
                    onContinue={openSource}
                    onRemove={removeFromOnboarding}
                    busy={busySourceId === source.id}
                  />
                ))}
              </div>
            )
          )}

          {tab === "ai" && (
            <AiSuggestionsPanel
              objectiveId={id}
              objectiveName={objective?.name || ""}
              onSourcesChanged={sources.refresh}
              onToast={setToast}
              startToken={aiStartToken}
            />
          )}
        </div>

        {sources.status === "ready" && (
          <DisabledSourcesSection sources={sources.data.disabled} onOpen={openSource} onReenable={restoreSource} />
        )}
      </main>

      {modifySource && (
        <div className="wsmodal" role="dialog" aria-modal="true" aria-labelledby="modify-source-title">
          <div className="wsmodal__card">
            <span className="eyebrow">Modify source</span>
            <h2 id="modify-source-title">{modifySource.name}</h2>
            <p>Explain what changed or what needs to be updated. The source will move to Source onboarding.</p>
            <label className="madd__field">
              <span>Modification reason *</span>
              <textarea
                rows={4}
                value={modifyReason}
                onChange={(event) => setModifyReason(event.target.value)}
                placeholder="e.g. Azure endpoint URL changed, credentials expired, or a different feed should be used"
                autoFocus
              />
            </label>
            <div className="madd__actions">
              <button className="btn btn--primary" onClick={confirmModify} disabled={!modifyReason.trim()}>Move to onboarding</button>
              <button className="btn btn--ghost" onClick={() => setModifySource(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
