import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonitoringObjectives } from "../hooks/useMonitoringObjectives.js";
import { getMonitoringObjectiveInformationSources } from "../services/api.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Hero from "../components/monitoring-objectives/Hero.jsx";
import MonitoringObjectiveCard from "../components/monitoring-objectives/MonitoringObjectiveCard.jsx";
import CustomObjectiveCard from "../components/monitoring-objectives/CustomObjectiveCard.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import EmptyState from "../components/shared/EmptyState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import Toast from "../components/shared/Toast.jsx";

/**
 * Monitoring Objectives — the platform's first-experience page.
 * Each objective is a fully-clickable card that opens its workspace. No AI runs
 * here. Per-objective "Sources in use" counts are fetched from the backend and
 * fill in as they resolve; a failed count simply leaves the card without a
 * number (the card still opens).
 */
export default function MonitoringObjectivesPage() {
  const navigate = useNavigate();
  const { status, objectives, error, reload } = useMonitoringObjectives();
  const [countsById, setCountsById] = useState({});
  const [toast, setToast] = useState("");
  const acRef = useRef(null);

  // Once objectives are loaded, pull each objective's source counts in parallel.
  // Failures are swallowed per-objective so one bad call doesn't blank the grid.
  useEffect(() => {
    if (status !== "ready" || objectives.length === 0) return;
    const ac = new AbortController();
    acRef.current = ac;
    let cancelled = false;

    Promise.allSettled(
      objectives.map((o) =>
        getMonitoringObjectiveInformationSources(o.id, { signal: ac.signal }).then((res) => ({
          id: o.id,
          counts: res.counts,
        }))
      )
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value) map[r.value.id] = r.value.counts;
      });
      setCountsById(map);
    });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [status, objectives]);

  const openObjective = (id) => navigate(`/monitoring-objectives/${encodeURIComponent(id)}`);

  return (
    <div className="app">
      <TopBar active="configure" />

      <main className="container">
        <Hero />

        <div className="section-head">
          <h2>Monitoring objectives</h2>
          <span>Open one to manage the information sources that monitor it.</span>
        </div>

        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState error={error} onRetry={reload} />}
        {status === "empty" && <EmptyState onRetry={reload} />}

        {status === "ready" && (
          <>
            <div className="grid" aria-label="Monitoring objectives">
              {objectives.map((obj) => (
                <MonitoringObjectiveCard
                  key={obj.id}
                  objective={obj}
                  counts={countsById[obj.id] || null}
                  onOpen={() => openObjective(obj.id)}
                />
              ))}
            </div>

            <CustomObjectiveCard
              onActivate={() => setToast("Custom monitoring objectives are coming in the next iteration.")}
            />
          </>
        )}
      </main>

      <Footer />

      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
