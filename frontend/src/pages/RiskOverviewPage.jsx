import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRiskOverview } from "../services/api.js";
import { enrichOverviewObjective } from "../data/riskAssumptions.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import RiskObjectiveTile from "../components/risk/RiskObjectiveTile.jsx";
import "../styles/risk-room.css";

function deriveIconKey(name = "", id = "") {
  const hint = `${id} ${name}`.toLowerCase();
  if (hint.includes("geo") || hint.includes("politic") || hint.includes("regulat"))
    return "geopolitical";
  if (hint.includes("supplier") || hint.includes("vendor")) return "supplier";
  if (hint.includes("weather") || hint.includes("hazard")) return "weather";
  if (hint.includes("commod") || hint.includes("energy") || hint.includes("price"))
    return "commodity";
  if (hint.includes("customer") || hint.includes("commercial")) return "customer";
  if (hint.includes("workforce") || hint.includes("hse") || hint.includes("labour"))
    return "workforce";
  return "generic";
}

/**
 * Executive home — risk posture across monitoring objectives.
 * Source admin stays at /configure/objectives.
 */
export default function RiskOverviewPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    setStatus("loading");
    setError(null);
    getRiskOverview({ signal: ac.signal })
      .then((res) => {
        setData(res);
        setStatus("ready");
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setError(err);
        setStatus("error");
      });
    return () => ac.abort();
  }, []);

  const reload = () => {
    setStatus("loading");
    setError(null);
    getRiskOverview()
      .then((res) => {
        setData(res);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err);
        setStatus("error");
      });
  };

  const risks = data?.risks || [];
  const objectives = useMemo(() => {
    const list = data?.objectives || [];
    return list
      .map((o) =>
        enrichOverviewObjective({
          ...o,
          iconKey: deriveIconKey(o.name, o.id),
          factors: o.relatedRiskFactors || o.factors,
        })
      )
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [data]);

  const summary = useMemo(() => {
    if (!objectives.length) return data?.summary;
    const overall = Math.round(
      objectives.reduce((a, o) => a + (o.score || 0), 0) / objectives.length
    );
    const critical = objectives.filter((o) => (o.score || 0) >= 75).length;
    const top = objectives[0];
    return {
      overallScore: overall,
      overallLevelLabel: top?.levelLabel || data?.summary?.overallLevelLabel,
      criticalObjectives: critical,
      objectivesMonitored: objectives.length,
      illustrative: true,
    };
  }, [objectives, data]);

  return (
    <div className="app">
      <TopBar active="overview" />

      <main className="container risk-home">
        <header className="risk-home__head">
          <div>
            <div className="eyebrow">Enterprise risk posture</div>
            <h1>Risk overview</h1>
            <p className="risk-home__sub">
              Live risk across every monitoring objective. Open a tile to drill
              into its case — or manage the sources that feed it.
            </p>
          </div>
          {summary?.illustrative && (
            <span className="risk-home__badge">
              Scores · likelihood × impact (demo assumptions)
            </span>
          )}
        </header>

        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState error={error} onRetry={reload} />}

        {status === "ready" && (
          <>
            <div className="risk-kpis">
              <div className="risk-kpi risk-kpi--hero">
                <div className="risk-kpi__label">Overall enterprise risk</div>
                <div className="risk-kpi__val">{summary?.overallScore ?? "—"}</div>
                <div className="risk-kpi__meta">{summary?.overallLevelLabel}</div>
              </div>
              <div className="risk-kpi">
                <div className="risk-kpi__label">Critical objectives</div>
                <div className="risk-kpi__val">
                  {summary?.criticalObjectives ?? 0}
                  <small> / {summary?.objectivesMonitored ?? 0}</small>
                </div>
              </div>
              <div className="risk-kpi">
                <div className="risk-kpi__label">Objectives monitored</div>
                <div className="risk-kpi__val">{summary?.objectivesMonitored ?? 0}</div>
              </div>
            </div>

            <div className="risk-ov-cols">
              <div className="risk-ov-main">
                <div className="section-head">
                  <h2>Monitoring objectives</h2>
                  <span>Sorted by risk · 2 per row · gauge + 6-mo trend</span>
                </div>

                <div className="risk-grid" aria-label="Risk by monitoring objective">
                  {objectives.map((obj) => (
                    <RiskObjectiveTile
                      key={obj.id}
                      objective={obj}
                      onOpenCases={(o) =>
                        navigate(
                          `/monitoring-objectives/${encodeURIComponent(o.id)}/cases`
                        )
                      }
                      onManageSources={(o) =>
                        navigate(`/monitoring-objectives/${encodeURIComponent(o.id)}`)
                      }
                    />
                  ))}
                </div>
              </div>

              <aside className="risk-rail" aria-label="Identified risks">
                <div className="risk-rail__h">Identified risks</div>
                <div className="risk-rail__title">
                  Risks <small>· {risks.length}</small>
                </div>
                <p className="risk-rail__sub">
                  Risk definitions arising from factors each objective monitors,
                  worst-first. Open a published case to drill in.
                </p>
                <div className="risk-rail__list">
                  {risks.map((r) => {
                    const openable = Boolean(r.hasCase && r.caseId);
                    const body = (
                      <>
                        <span className={`risk-rail__dot risk-rail__dot--${r.level}`} />
                        <span className="risk-rail__main">
                          <span className="risk-rail__name">{r.name}</span>
                          <span className="risk-rail__obj">{r.objectiveName}</span>
                        </span>
                        {openable ? (
                          <span className="risk-rail__go">→</span>
                        ) : (
                          <span className="risk-rail__prep">in prep</span>
                        )}
                      </>
                    );
                    return openable ? (
                      <button
                        type="button"
                        key={r.name}
                        className="risk-rail__row"
                        onClick={() =>
                          navigate(`/risk-cases/${encodeURIComponent(r.caseId)}`)
                        }
                      >
                        {body}
                      </button>
                    ) : (
                      <div key={r.name} className="risk-rail__row risk-rail__row--muted">
                        {body}
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>

            <p className="risk-home__note">
              Need to add or configure sources?{" "}
              <button
                type="button"
                className="linkish"
                onClick={() => navigate("/configure/objectives")}
              >
                Open source configuration
              </button>
            </p>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
