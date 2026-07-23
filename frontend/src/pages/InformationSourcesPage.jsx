import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMonitoringObjective } from "../hooks/useMonitoringObjective.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import Toast from "../components/shared/Toast.jsx";
import ObjectiveContextHeader from "../components/information-sources/ObjectiveContextHeader.jsx";
import InformationSourceGroup from "../components/information-sources/InformationSourceGroup.jsx";
import CustomInformationSourceCard from "../components/information-sources/CustomInformationSourceCard.jsx";
import SourcesSummaryPanel from "../components/information-sources/SourcesSummaryPanel.jsx";
import "../styles/information-sources.css";

const TIERS = ["internal", "external", "historical"];
const OBJECTIVES_ROUTE = "/configure/objectives";
const storageKey = (id) => `rdt.selectedSources.${id}`;

/** Read previously selected source ids for this objective from sessionStorage. */
function readStored(id) {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Information Sources — second page of the Configure workflow.
 * Loads the objective detail, lets the user multi-select suggested sources
 * (persisted to sessionStorage), and summarizes the selection. No backend save.
 */
export default function InformationSourcesPage() {
  const { objectiveId } = useParams();
  const navigate = useNavigate();
  const { status, objective, error, reload } = useMonitoringObjective(objectiveId);

  const [selectedIds, setSelectedIds] = useState(() => readStored(objectiveId));
  const [toast, setToast] = useState("");

  // Persist selection (by id) to sessionStorage on every change.
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(objectiveId), JSON.stringify(selectedIds));
    } catch {
      /* storage unavailable — selection still lives in React state */
    }
  }, [selectedIds, objectiveId]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Counts of *selected* sources per tier for the summary panel.
  const counts = useMemo(() => {
    const c = { total: 0, internal: 0, external: 0, historical: 0 };
    if (objective) {
      objective.sources.forEach((s) => {
        if (selectedSet.has(s.id)) {
          c.total += 1;
          c[s.role] += 1;
        }
      });
    }
    return c;
  }, [objective, selectedSet]);

  const goBack = () => navigate(OBJECTIVES_ROUTE);

  return (
    <div className="app">
      <TopBar />

      <main className="container">
        {status === "loading" && (
          <div className="is-page-pad">
            <LoadingState />
          </div>
        )}

        {status === "error" && (
          <div className="is-page-pad">
            {error?.status === 404 ? (
              <div className="state">
                <h3>Monitoring objective not found</h3>
                <p>We couldn’t find that objective. It may have been removed.</p>
                <button className="btn btn--primary" onClick={goBack}>
                  Back to objectives
                </button>
              </div>
            ) : (
              <ErrorState error={error} onRetry={reload} />
            )}
          </div>
        )}

        {status === "ready" && objective && (
          <>
            <ObjectiveContextHeader objective={objective} onBack={goBack} />

            <div className="section-head">
              <h2>Information sources</h2>
              <span>Select the concrete sources to connect for this objective — one or more.</span>
            </div>

            {TIERS.map((tier) => (
              <InformationSourceGroup
                key={tier}
                tier={tier}
                sources={objective.grouped[tier]}
                selected={selectedSet}
                onToggle={toggle}
              />
            ))}

            <CustomInformationSourceCard
              onActivate={() =>
                setToast("Adding custom information sources is coming in a later sprint.")
              }
            />

            <SourcesSummaryPanel
              objectiveName={objective.name}
              counts={counts}
              onBack={goBack}
              onContinue={() =>
                setToast("Connector analysis will be implemented in the next sprint.")
              }
              canContinue={counts.total > 0}
            />
          </>
        )}
      </main>

      <Footer />

      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
