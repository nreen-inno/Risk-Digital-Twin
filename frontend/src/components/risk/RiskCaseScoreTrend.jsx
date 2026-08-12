/**
 * Score trend card for the risk case page — line chart over recent weeks
 * plus optional live bump marker when connector evidence raises the score.
 */
export default function RiskCaseScoreTrend({ riskCase }) {
  const accent = riskCase?.accent || "#156082";
  const level = riskCase?.level || "ok";
  const current = Number(riskCase?.score) || 0;
  const baseline =
    typeof riskCase?.baselineScore === "number"
      ? riskCase.baselineScore
      : null;
  const scoreBump = Number(riskCase?.scoreBump) || 0;
  const hasLiveBump = scoreBump > 0 && baseline != null && current !== baseline;

  const series = buildSeries(riskCase?.trend, current, baseline, hasLiveBump);
  if (series.length < 2) return null;

  const first = series[0];
  const delta = current - first;
  const w = 280;
  const h = 88;
  const padX = 8;
  const padY = 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;
  const min = Math.min(...series, 0);
  const max = Math.max(...series, 100);
  const rng = max - min || 1;

  const coords = series.map((v, i) => {
    const x = padX + (i / (series.length - 1)) * chartW;
    const y = padY + chartH - ((v - min) / rng) * chartH;
    return { x, y, v };
  });

  const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padY + chartH} L ${coords[0].x} ${padY + chartH} Z`;

  const liveSplitIdx = hasLiveBump ? coords.length - 2 : -1;
  const baselinePath =
    liveSplitIdx >= 0
      ? coords
          .slice(0, liveSplitIdx + 2)
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")
      : null;
  const livePath =
    liveSplitIdx >= 0
      ? coords
          .slice(liveSplitIdx)
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")
      : null;

  const last = coords[coords.length - 1];

  return (
    <aside
      className={`risk-case-trend risk-case-trend--${level}`}
      aria-label={`Risk score trend, currently ${current}`}
    >
      <div className="risk-case-trend__top">
        <span className="risk-case-trend__label">Score trend</span>
        <span className="risk-case-trend__score">{current}</span>
      </div>

      <svg
        className="risk-case-trend__chart"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`riskTrendFill-${level}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={w - padX}
            y1={padY + chartH * t}
            y2={padY + chartH * t}
            stroke="rgba(14, 40, 65, 0.06)"
            strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill={`url(#riskTrendFill-${level})`} />

        {hasLiveBump && baselinePath && livePath ? (
          <>
            <path
              d={baselinePath}
              fill="none"
              stroke={accent}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.55"
            />
            <path
              d={livePath}
              fill="none"
              stroke="#0f9ed5"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 3"
            />
          </>
        ) : (
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <circle cx={last.x} cy={last.y} r="4.2" fill="#fff" stroke={hasLiveBump ? "#0f9ed5" : accent} strokeWidth="2.2" />
      </svg>

      <div className="risk-case-trend__foot">
        <span className="risk-case-trend__range">6 wk ago · {first}</span>
        <span
          className={`risk-case-trend__delta ${delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""}`}
        >
          {delta > 0 ? `▲ +${delta} pts` : delta < 0 ? `▼ ${delta} pts` : "— flat"}
        </span>
        <span className="risk-case-trend__range">Now · {current}</span>
      </div>

      {hasLiveBump && (
        <p className="risk-case-trend__live">
          Live bump <b>{baseline}→{current}</b> after new source evidence
        </p>
      )}
    </aside>
  );
}

function buildSeries(trend, current, baseline, hasLiveBump) {
  const base = (Array.isArray(trend) ? trend : [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (!base.length && Number.isFinite(current)) return [current];

  const series = [...base];
  if (!Number.isFinite(current)) return series;

  if (hasLiveBump && Number.isFinite(baseline)) {
    if (series.length) series[series.length - 1] = baseline;
    else series.push(baseline);
    if (current !== baseline) series.push(current);
    return series;
  }

  if (series.length) series[series.length - 1] = current;
  else series.push(current);
  return series;
}
