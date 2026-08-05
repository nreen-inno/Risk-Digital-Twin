import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRiskCasesForObjective } from "../services/api.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import "../styles/risk-room.css";

/**
 * Short list of risk cases under one monitoring objective.
 * One objective → many cases; only published ones open the full case page.
 */
export default function ObjectiveRiskCasesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    setStatus("loading");
    getRiskCasesForObjective(id, { signal: ac.signal })
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
  }, [id]);

  const objective = data?.objective;
  const cases = data?.cases || [];
  const counts = data?.counts;

  return (
    <div className="app">
      <TopBar active="overview" />

      <main className="container risk-case">
        <button type="button" className="risk-back" onClick={() => navigate("/")}>
          ← Risk overview
        </button>

        {status === "loading" && <LoadingState />}
        {status === "error" && (
          <ErrorState error={error} onRetry={() => window.location.reload()} />
        )}

        {status === "ready" && (
          <>
            <header className="risk-case__head">
              <div>
                <span className="cat">Monitoring objective</span>
                <h1>{objective?.name}</h1>
                <p className="risk-case__def">{objective?.businessQuestion}</p>
                <p className="risk-home__sub" style={{ marginTop: 8 }}>
                  One objective monitors many risks. Open a published case, or
                  manage the sources that feed this watch.
                </p>
              </div>
            </header>

            <div className="risk-case-list__bar">
              <span>
                <strong>{counts?.published ?? 0}</strong> published
                {" · "}
                <strong>{counts?.inPreparation ?? 0}</strong> in preparation
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() =>
                  navigate(`/monitoring-objectives/${encodeURIComponent(id)}`)
                }
              >
                Manage sources
              </button>
            </div>

            <div className="risk-case-list">
              {cases.map((c) => {
                const openable = Boolean(c.hasCase && c.caseId);
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`risk-case-card ${openable ? "" : "is-prep"}`}
                    disabled={!openable}
                    onClick={() => {
                      if (openable) {
                        navigate(`/risk-cases/${encodeURIComponent(c.caseId)}`);
                      }
                    }}
                  >
                    <div className="risk-case-card__top">
                      <span className={`risk-lvl risk-lvl--${c.level}`}>
                        {c.levelLabel?.toUpperCase() || c.level}
                      </span>
                      <span className="risk-case-card__score">{c.score}</span>
                    </div>
                    <h2 className="risk-case-card__title">{c.title}</h2>
                    <div className="risk-case-card__def">
                      Risk definition · <b>{c.riskDefinition}</b>
                    </div>
                    {c.summary && (
                      <p className="risk-case-card__sum">{c.summary}</p>
                    )}
                    <div className="risk-case-card__foot">
                      {openable ? (
                        <span className="risk-tile__hint">Open case →</span>
                      ) : (
                        <span className="risk-rail__prep">Case in preparation</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
