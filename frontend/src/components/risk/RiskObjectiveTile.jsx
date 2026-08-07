import { ObjectiveIcon } from "../../lib/icons.jsx";

const GAUGE_R = 264;

function Sparkline({ points, color }) {
  const pts = (points || []).map(Number).filter((n) => Number.isFinite(n));
  if (pts.length < 2) return null;
  const w = 120;
  const h = 36;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const rng = max - min || 1;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p - min) / rng) * (h - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="risk-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={d}
        fill="none"
        stroke={color || "#F57C00"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Executive tile — gauge + 6-mo trend + drivers, matching Artefact Gallery layout.
 * Primary click opens the objective's risk-case list (one MO → many cases).
 */
export default function RiskObjectiveTile({ objective, onOpenCases, onManageSources }) {
  const level = objective.level || "ok";
  const score = objective.score ?? 0;
  const color = objective.color || "#F57C00";
  const dash = Math.round((score / 100) * GAUGE_R);
  const delta = objective.trendDelta ?? 0;

  const handlePrimary = () => onOpenCases(objective);

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePrimary();
    }
  };

  return (
    <article
      className={`risk-tile risk-tile--${level}`}
      role="button"
      tabIndex={0}
      onClick={handlePrimary}
      onKeyDown={handleKey}
      aria-label={`View risk cases for ${objective.name}`}
    >
      <div className="risk-tile__top">
        <span className="risk-tile__icon">
          <ObjectiveIcon iconKey={objective.iconKey || "generic"} width={22} height={22} />
        </span>
        <div>
          <h3 className="risk-tile__name">{objective.name}</h3>
          <p className="risk-tile__q">{objective.businessQuestion}</p>
        </div>
      </div>

      <div className="risk-gauge-wrap">
        <div className="risk-gauge" aria-label={`Risk score ${score}`}>
          <svg width="74" height="74" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#eef1f6" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${GAUGE_R}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="risk-gauge__num">{score}</span>
        </div>
        <div className="risk-gauge__meta">
          <span className={`risk-lvl risk-lvl--${level}`}>
            {(objective.levelLabel || level).toUpperCase()}
          </span>
          <div className="risk-gauge__cap">
            {objective.scoreBump > 0
              ? `Live evidence +${objective.scoreBump} · was ${objective.baselineScore ?? "—"}`
              : "Composite risk · 6-month trend"}
          </div>
          {objective.liveBackedFactors > 0 ? (
            <div className="risk-trend-delta is-up">
              {objective.liveBackedFactors} live-backed factor
              {objective.liveBackedFactors === 1 ? "" : "s"}
              {objective.liveSignals ? ` · ${objective.liveSignals} signals` : ""}
            </div>
          ) : (
            <div
              className={`risk-trend-delta ${delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""}`}
            >
              {delta > 0 ? `▲ +${delta} pts` : delta < 0 ? `▼ ${delta} pts` : "— flat"}
            </div>
          )}
        </div>
        <Sparkline points={objective.trend} color={color} />
      </div>

      {objective.drivers?.length > 0 && (
        <div className="risk-tile__drivers">
          <div className="risk-tile__label">Top risk drivers</div>
          <div className="risk-driver-bars">
            {objective.drivers.map((d) => (
              <div className="risk-driver" key={d.name}>
                <i style={{ background: d.color || color }} />
                <span className="risk-driver__name">{d.name}</span>
                <span className="risk-driver__bar">
                  <span
                    style={{
                      width: `${Math.min(100, d.score || 0)}%`,
                      background: d.color || color,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {objective.factors?.length > 0 && (
        <div className="risk-tile__factors">
          <div className="risk-tile__label">Related risk factors</div>
          <div className="risk-factor-chips">
            {objective.factors.map((f) => (
              <span className="risk-factor-chip" key={f}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="risk-tile__foot">
        <span className="risk-tile__hint">View risk cases →</span>
        <button
          type="button"
          className="btn btn--ghost risk-tile__src"
          onClick={(e) => {
            e.stopPropagation();
            onManageSources(objective);
          }}
        >
          Sources
        </button>
      </div>
    </article>
  );
}
