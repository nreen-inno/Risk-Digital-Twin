import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRiskCaseById } from "../services/api.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import LoadingState from "../components/shared/LoadingState.jsx";
import ErrorState from "../components/shared/ErrorState.jsx";
import RiskCaseNetwork from "../components/risk/RiskCaseNetwork.jsx";
import "../styles/risk-room.css";

const SEV = { crit: "crit", high: "high", elev: "elev", ok: "ok" };

export default function RiskCasePage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [riskCase, setRiskCase] = useState(null);
  const [error, setError] = useState(null);
  const [openFactor, setOpenFactor] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setStatus("loading");
    setError(null);
    getRiskCaseById(caseId, { signal: ac.signal })
      .then((res) => {
        setRiskCase(res);
        setStatus("ready");
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setError(err);
        setStatus("error");
      });
    return () => ac.abort();
  }, [caseId]);

  const reload = () => {
    setStatus("loading");
    setError(null);
    getRiskCaseById(caseId)
      .then((res) => {
        setRiskCase(res);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err);
        setStatus("error");
      });
  };

  return (
    <div className="app">
      <TopBar active="overview" />

      <main className="container risk-case">
        <button type="button" className="risk-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState error={error} onRetry={reload} />}

        {status === "ready" && riskCase && (
          <>
            <header className="risk-case__head">
              <div>
                <span className="cat">{riskCase.categoryLabel}</span>
                <h1>{riskCase.title}</h1>
                <p className="risk-case__def">
                  Risk definition · <b>{riskCase.riskDefinition}</b>
                  {" · "}
                  monitored via{" "}
                  <button
                    type="button"
                    className="linkish"
                    onClick={() =>
                      navigate(
                        `/monitoring-objectives/${encodeURIComponent(
                          riskCase.monitoringObjectiveId
                        )}`
                      )
                    }
                  >
                    open sources
                  </button>
                </p>
                <span className={`risk-lvl risk-lvl--${riskCase.level}`}>
                  Score {riskCase.score} · {String(riskCase.level).toUpperCase()}
                </span>
                {riskCase.provenance?.illustrative && (
                  <span className="risk-home__badge" style={{ marginLeft: 8 }}>
                    Illustrative intelligence
                  </span>
                )}
              </div>
            </header>

            <div className="risk-case__qa">
              <section>
                <h2 className="risk-case__h">What is happening now</h2>
                <p className="risk-case__now">{riskCase.summary}</p>
              </section>
              <section>
                <h2 className="risk-case__h">Enterprise impact</h2>
                <div className="risk-impacts">
                  {(riskCase.impacts || []).map((im) => (
                    <div className="risk-impact" key={im.label}>
                      <div className="risk-impact__v">{im.value}</div>
                      <div className="risk-impact__l">{im.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="risk-case__block">
              <h2 className="risk-case__h">How it spreads</h2>
              <RiskCaseNetwork network={riskCase.network} />
            </section>

            <section className="risk-case__block">
              <h2 className="risk-case__h">Signals from your sources</h2>
              <p className="risk-live__note">
                {riskCase.liveEvidence?.note ||
                  "Only signals that match this risk case theme are shown."}
              </p>
              {(riskCase.liveEvidence?.sourcesUsed || []).length > 0 && (
                <div className="risk-live__sources">
                  {riskCase.liveEvidence.sourcesUsed.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className="risk-live__chip"
                      onClick={() =>
                        navigate(`/information-sources/${encodeURIComponent(s.id)}`)
                      }
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {(riskCase.liveEvidence?.signals || []).length === 0 ? (
                <p className="risk-live__empty">
                  No collected records yet. Open sources, run a connector fetch / approve
                  sample, then refresh this case.
                </p>
              ) : (
                <ul className="risk-live__list">
                  {riskCase.liveEvidence.signals.map((sig) => (
                    <li key={sig.id || sig.title} className="risk-live__item">
                      <div className="risk-live__item-top">
                        <strong>{sig.title}</strong>
                        <span className="risk-live__badge">From connector</span>
                      </div>
                      {sig.snippet && sig.snippet !== sig.title && (
                        <p>{sig.snippet}</p>
                      )}
                      <div className="risk-live__meta">
                        <span>{sig.sourceName}</span>
                        {sig.suggestedFactor && (
                          <span>→ factor hint: {sig.suggestedFactor}</span>
                        )}
                        {sig.collectedAt && (
                          <span>
                            {new Date(sig.collectedAt).toLocaleString()}
                          </span>
                        )}
                        {sig.canonicalUrl && (
                          <a
                            href={sig.canonicalUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="risk-case__block">
              <h2 className="risk-case__h">Why — evidence-backed factors</h2>
              <div className="risk-facs">
                {(riskCase.factors || []).map((f, i) => {
                  const open = openFactor === i;
                  return (
                    <div className={`risk-fac ${open ? "is-open" : ""}`} key={f.name}>
                      <button
                        type="button"
                        className="risk-fac__row"
                        onClick={() => setOpenFactor(open ? -1 : i)}
                      >
                        <i
                          className={`risk-fac__dot risk-fac__dot--${SEV[f.severity] || "ok"}`}
                        />
                        <span className="risk-fac__name">{f.name}</span>
                        <span className="risk-fac__src">
                          {f.liveSignalCount > 0
                            ? `${f.liveSignalCount} live · `
                            : ""}
                          {f.illustrative ? "illustrative · " : ""}
                          {f.tier} · {f.sourceName}
                        </span>
                      </button>
                      {open && (
                        <div className="risk-fac__ev">
                          <p>{f.observation}</p>
                          <div className="risk-fac__meta">
                            <span>
                              Confidence <b>{f.confidence}%</b>
                            </span>
                            <span>
                              Observed <b>{f.when}</b>
                            </span>
                          </div>
                          {(f.liveSignals || []).length > 0 && (
                            <div className="risk-fac__live">
                              <div className="risk-fac__live-h">From your sources</div>
                              {f.liveSignals.map((sig) => (
                                <div key={sig.id || sig.title} className="risk-fac__live-row">
                                  <b>{sig.sourceName}</b>: {sig.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="risk-case__block">
              <h2 className="risk-case__h">What should we do</h2>
              <div className="risk-acts">
                {(riskCase.actions || []).map((a) => (
                  <div className="risk-act" key={a.title}>
                    <span className={`risk-prio risk-prio--${a.priority}`}>
                      P{a.priority}
                    </span>
                    <div>
                      <div className="risk-act__t">{a.title}</div>
                      <div className="risk-act__d">{a.detail}</div>
                      <div className="risk-act__eff">
                        {(a.effects || []).map((e) => (
                          <span
                            key={e.label}
                            className={e.warn ? "eff eff--warn" : "eff"}
                          >
                            {e.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {riskCase.aiInsight && (
              <div className="risk-ai">
                <div
                  dangerouslySetInnerHTML={{ __html: riskCase.aiInsight.html }}
                />
                <span className="risk-ai__conf">
                  Confidence {riskCase.aiInsight.confidence}%
                </span>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
