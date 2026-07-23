import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonitoringObjectives } from "../hooks/useMonitoringObjectives.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Hero from "../components/monitoring-objectives/Hero.jsx";
import MonitoringObjectiveCard from "../components/monitoring-objectives/MonitoringObjectiveCard.jsx";
import CustomObjectiveCard from "../components/monitoring-objectives/CustomObjectiveCard.jsx";
import SelectedObjectivePanel from "../components/monitoring-objectives/SelectedObjectivePanel.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import EmptyState from "../components/shared/EmptyState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import Toast from "../components/shared/Toast.jsx";

/**
 * Monitoring Objectives — the platform's first-experience page.
 * Owns the page-level composition and selection/toast state; all data loading
 * is delegated to the useMonitoringObjectives hook and services/api.js.
 */
export default function MonitoringObjectivesPage() {
  const navigate = useNavigate();
  const { status, objectives, error, reload } = useMonitoringObjectives();
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState("");

  const selected = useMemo(
    () => objectives.find((o) => o.id === selectedId) || null,
    [objectives, selectedId]
  );

  return (
    <div className="app">
      <TopBar />

      <main className="container">
        <Hero />

        <div className="section-head">
          <h2>Monitoring objectives</h2>
          <span>Choose one to begin — the AI advisor will recommend sources in the next step.</span>
        </div>

        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState error={error} onRetry={reload} />}
        {status === "empty" && <EmptyState onRetry={reload} />}

        {status === "ready" && (
          <>
            <div className="grid" role="radiogroup" aria-label="Monitoring objectives">
              {objectives.map((obj) => (
                <MonitoringObjectiveCard
                  key={obj.id}
                  objective={obj}
                  selected={obj.id === selectedId}
                  onSelect={() => setSelectedId(obj.id)}
                />
              ))}
            </div>

            <CustomObjectiveCard
              onActivate={() => setToast("Custom monitoring objectives are coming in the next iteration.")}
            />

            {selected && (
              <SelectedObjectivePanel
                objective={selected}
                onContinue={() => navigate(`/configure/objectives/${selected.id}/source-advisor`)}
              />
            )}
          </>
        )}
      </main>

      <Footer />

      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
