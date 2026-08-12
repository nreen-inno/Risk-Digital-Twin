import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getRiskCasesForObjective,
  reviewRiskCaseForObjective,
  restoreDismissedRiskCases
} from "../services/api.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import "../styles/risk-room.css";

/**
 * Short list of risk cases under one monitoring objective.
 * AI suggests cases from monitoring signals; human Accept / Reject decides relevance.
 * Only published + accepted cases open the full case page.
 */
export default function ObjectiveRiskCasesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const load = (signal) => {
    setStatus("loading");
    return getRiskCasesForObjective(id, { signal })
      .then((res) => {
        setData(res);
        setStatus("ready");
      })
      .catch((err) => {
        if (signal?.aborted) return;
        setError(err);
        setStatus("error");
      });
  };

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [id]);

  const onRestoreDismissed = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      await restoreDismissedRiskCases(id);
      await load();
    } catch (err) {
      setError(err);
      setStatus("error");
    } finally {
      setRestoring(false);
    }
  };

  const onReview = async (caseItem, decision) => {
    if (busyId) return;
    setBusyId(caseItem.id);
    try {
      await reviewRiskCaseForObjective(id, caseItem.id, decision);
      await load();
    } catch (err) {
      setError(err);
      setStatus("error");
    } finally {
      setBusyId(null);
    }
  };

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

        {status === "loading" && !data && <LoadingState />}
        {status === "error" && (
          <ErrorState error={error} onRetry={() => load()} />
        )}

        {(status === "ready" || (status === "loading" && data)) && (
          <>
            <header className="risk-case__head">
              <div>
                <span className="cat">Monitoring objective</span>
                <h1>{objective?.name}</h1>
                <p className="risk-case__def">{objective?.businessQuestion}</p>
                <p className="risk-home__sub" style={{ marginTop: 8 }}>
                  Monitoring signals surface candidate risk cases. Accept those
                  that are relevant, or reject noise — then open accepted cases
                  or manage the sources that feed this watch.
                </p>
              </div>
            </header>

            <div className="risk-case-list__bar">
              <span>
                <strong>{counts?.accepted ?? 0}</strong> accepted
                {" · "}
                <strong>{counts?.suggested ?? 0}</strong> suggested
                {" · "}
                <strong>{counts?.published ?? 0}</strong> published
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={restoring}
                onClick={onRestoreDismissed}
                title="Bring back dismissed cases for the next demo run"
              >
                {restoring ? "Restoring…" : "Restore dismissed (demo)"}
              </button>
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
              {cases.length === 0 && (
                <p className="risk-home__sub">
                  No open risk cases for this objective. Dismissed cases are hidden —
                  use <b>Restore dismissed (demo)</b> to show them again.
                </p>
              )}
              {cases.map((c) => {
                const openable =
                  Boolean(c.hasCase && c.caseId) && c.reviewStatus === "accepted";
                const suggested = c.reviewStatus === "suggested";
                const reviewing = busyId === c.id;

                return (
                  <article
                    key={c.id}
                    className={`risk-case-card ${suggested ? "is-suggested" : ""} ${
                      openable ? "is-openable" : "is-prep"
                    }`}
                  >
                    <div className="risk-case-card__top">
                      <div className="risk-case-card__badges">
                        <span className={`risk-lvl risk-lvl--${c.level}`}>
                          {c.levelLabel?.toUpperCase() || c.level}
                        </span>
                        <span
                          className={`risk-case-card__origin risk-case-card__origin--${
                            suggested || c.origin === "aiTriggered" ? "ai" : "ok"
                          }`}
                        >
                          {suggested
                            ? c.originLabel || "AI suggested"
                            : c.reviewStatus === "accepted"
                              ? "Accepted"
                              : c.originLabel}
                        </span>
                      </div>
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
                      {suggested ? (
                        <div className="risk-case-card__actions">
                          <button
                            type="button"
                            className="btn btn--primary"
                            disabled={reviewing}
                            onClick={() => onReview(c, "accept")}
                          >
                            {reviewing ? "Saving…" : "Accept"}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={reviewing}
                            onClick={() => onReview(c, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      ) : openable ? (
                        <div className="risk-case-card__actions">
                          <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() =>
                              navigate(`/risk-cases/${encodeURIComponent(c.caseId)}`)
                            }
                          >
                            Open case →
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={reviewing}
                            onClick={() => onReview(c, "delete")}
                          >
                            {reviewing ? "Removing…" : "Remove case"}
                          </button>
                        </div>
                      ) : (
                        <span className="risk-rail__prep">
                          Accepted · case room in preparation
                        </span>
                      )}
                    </div>
                  </article>
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
