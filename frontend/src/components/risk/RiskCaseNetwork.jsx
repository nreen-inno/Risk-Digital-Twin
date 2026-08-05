/**
 * Situation-room lane network (sources → factors → risk → linked → impact).
 */
export default function RiskCaseNetwork({ network }) {
  if (!network?.lanes?.length || !network?.nodes?.length) return null;

  const { lanes, nodes, links = [] } = network;
  const W = 1120;
  const laneW = W / lanes.length;
  const boxW = Math.min(180, laneW - 26);
  const boxH = 42;
  const vgap = 15;

  const byLane = {};
  nodes.forEach((n) => {
    (byLane[n.lane] = byLane[n.lane] || []).push(n);
  });
  const maxCount = Math.max(...Object.values(byLane).map((a) => a.length), 1);
  const H = maxCount * (boxH + vgap) - vgap + 16;
  const pos = {};

  Object.keys(byLane).forEach((l) => {
    const arr = byLane[l];
    const cx = laneW * Number(l) + laneW / 2;
    const total = arr.length * (boxH + vgap) - vgap;
    let sy = (H - total) / 2;
    arr.forEach((n, i) => {
      const y = sy + i * (boxH + vgap);
      pos[n.id] = { x: cx - boxW / 2, y, cx, cy: y + boxH / 2 };
    });
  });

  const COL = {
    crit: "#D32F2F",
    high: "#F57C00",
    elev: "#E0A400",
    ok: "#2E8B57",
    src: "#9aa6ba",
  };

  return (
    <div className="risk-net">
      <svg viewBox={`0 0 ${W} ${H + 30}`} role="img" aria-label="Risk propagation network">
        <defs>
          <marker
            id="risk-ah"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill="#a9b4c4" />
          </marker>
        </defs>
        {lanes.slice(1).map((_, i) => (
          <line
            key={`sep-${i}`}
            x1={laneW * (i + 1)}
            y1={20}
            x2={laneW * (i + 1)}
            y2={H + 22}
            stroke="#eef1f6"
          />
        ))}
        {lanes.map((l, i) => (
          <text
            key={l}
            x={laneW * i + laneW / 2}
            y={12}
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            letterSpacing="0.07em"
            fill="#2f6bff"
          >
            {l.toUpperCase()}
          </text>
        ))}
        <g transform="translate(0,24)">
          {links.map(([a, b], i) => {
            const p = pos[a];
            const q = pos[b];
            if (!p || !q) return null;
            const x1 = p.x + boxW;
            const y1 = p.cy;
            const x2 = q.x;
            const y2 = q.cy;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={`lnk-${i}`}
                d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                fill="none"
                stroke="#cbd5e3"
                strokeWidth="1.6"
                markerEnd="url(#risk-ah)"
              />
            );
          })}
          {nodes.map((n) => {
            const p = pos[n.id];
            if (!p) return null;
            const cur = Boolean(n.current);
            const fill = cur ? "#14335f" : "#fff";
            const stroke = cur ? "#14335f" : "#e4e9f2";
            const txt = cur ? "#ffffff" : "#1f2a3a";
            const dot = COL[n.level] || COL.src;
            return (
              <g key={n.id}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={boxW}
                  height={boxH}
                  rx="10"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={cur ? 1.4 : 1}
                />
                {!cur && <circle cx={p.x + 16} cy={p.cy} r="4.5" fill={dot} />}
                <text
                  x={cur ? p.x + 14 : p.x + 27}
                  y={p.cy + 4}
                  fontSize="11"
                  fontWeight="600"
                  fill={txt}
                >
                  {n.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <p className="risk-net__cap">
        External signal → risk factors → risk → linked risks → yard / enterprise impact
      </p>
    </div>
  );
}
