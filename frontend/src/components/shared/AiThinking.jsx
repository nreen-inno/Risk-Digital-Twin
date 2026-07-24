import { useEffect, useState } from "react";
import "../../styles/ai-thinking.css";

// ---------------------------------------------------------------------------
// Static gear geometry (computed once at module load).
// "Precision gear" mark: machined-steel half + live Gemini-constellation half.
// ---------------------------------------------------------------------------
const N = 11;
const Ro = 42;
const Ri = 32;
const STEP = (2 * Math.PI) / N;
const P = (r, f, i) => [
  +(r * Math.cos(i * STEP + f * STEP)).toFixed(2),
  +(r * Math.sin(i * STEP + f * STEP)).toFixed(2),
];

const cogPts = [];
for (let i = 0; i < N; i++) {
  cogPts.push(P(Ri, 0, i), P(Ro, 0.14, i), P(Ro, 0.36, i), P(Ri, 0.5, i));
}
const COG =
  "M" + cogPts[0] + " L" + cogPts.slice(1).map((p) => p.join(",")).join(" L") + " Z";

const NODES = Array.from({ length: N }, (_, i) => P(Ro - 2, 0.25, i));
const SPOKES = NODES.map((n) => ({ x1: 0, y1: 0, x2: n[0], y2: n[1] }));
const RIM = NODES.map((n, i) => {
  const m = NODES[(i + 1) % N];
  return { x1: n[0], y1: n[1], x2: m[0], y2: m[1] };
});
const BEVEL = Array.from({ length: N }, (_, i) => {
  const a = P(Ri - 2, 0.25, i);
  const b = P(20, 0.25, i);
  return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
});

// Gemini (the Twins) — star positions only, no connecting lines.
const GEMINI_MINOR = [
  [8, -10], [21, -9], [10, -1], [20, 0], [9, 9], [22, 9], [11, 18], [19, 18],
];
const CASTOR = [9, -18];
const POLLUX = [22, -17];
const SPARK =
  "M0 -4.4 l1.15 3.25 3.25 1.15 -3.25 1.15 -1.15 3.25 -1.15 -3.25 -3.25 -1.15 3.25 -1.15 z";

function Star({ p, s, fill, cls }) {
  return (
    <g className={cls} transform={`translate(${p[0]},${p[1]}) scale(${s})`}>
      <path d={SPARK} fill={fill} />
    </g>
  );
}

function BrightStar({ p, cls }) {
  return (
    <g className={cls}>
      <circle cx={p[0]} cy={p[1]} r="2.6" fill="#2fe0c0" opacity="0.2" />
      <Star p={p} s={0.5} fill="#eafffb" />
    </g>
  );
}

function GearMark() {
  return (
    <svg className="ait-gear" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="aitSteel" x1="0" y1="-45" x2="0" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e9edf3" />
          <stop offset="45%" stopColor="#b3bccb" />
          <stop offset="100%" stopColor="#79828f" />
        </linearGradient>
        <clipPath id="aitL"><rect x="-60" y="-60" width="60" height="120" /></clipPath>
        <clipPath id="aitR"><rect x="0" y="-60" width="60" height="120" /></clipPath>
      </defs>
      <g transform="translate(50,50)">
        {/* bezel ring — slow counter-rotation */}
        <g className="ait-bezel" fill="none" stroke="#1e5b54" strokeWidth="1.2">
          <circle r="47.5" />
          <circle r="47.5" stroke="#2fe0c0" strokeDasharray="1.5 7" strokeWidth="1" opacity="0.7" />
        </g>

        <g className="ait-spin">
          {/* machined-steel half */}
          <g clipPath="url(#aitL)">
            <path d={COG} fill="url(#aitSteel)" stroke="#5b6472" strokeWidth="0.5" />
            <g stroke="#8b95a5" strokeWidth="0.5" opacity="0.55">
              {BEVEL.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
            </g>
            <circle r="15" fill="none" stroke="#6b7480" strokeWidth="1" />
          </g>

          {/* constellation (twin) half */}
          <g clipPath="url(#aitR)">
            <path d={COG} fill="#0a1a1e" />
            <path d={COG} fill="none" stroke="#2fe0c0" strokeWidth="1" strokeLinejoin="round" />
            <g stroke="#1f9d92" strokeWidth="0.6" opacity="0.8">
              {SPOKES.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
            </g>
            <g stroke="#2fe0c0" strokeWidth="0.5" opacity="0.45">
              {RIM.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
            </g>
            <circle r="15" fill="none" stroke="#2fe0c0" strokeWidth="0.8" opacity="0.7" />
            {/* Gemini stars — dots only, no connecting lines */}
            <g>{GEMINI_MINOR.map((p, i) => <Star key={i} p={p} s={0.32} fill="#8ff5e6" />)}</g>
            <BrightStar p={CASTOR} cls="ait-tw" />
            <BrightStar p={POLLUX} cls="ait-tw2" />
          </g>

          {/* seam + central bore */}
          <line x1="0" y1="-44" x2="0" y2="44" stroke="#2fe0c0" strokeWidth="0.6" opacity="0.55" />
          <circle r="7" fill="#05070b" stroke="#2fe0c0" strokeWidth="1" />
          <circle r="2.4" fill="#8ff5e6" />
          <Star p={[0, -53]} s={0.7} fill="#c9fff5" cls="ait-tw" />
        </g>
      </g>
    </svg>
  );
}

const DEFAULT_STEPS = [
  "Assessing coverage of your information needs",
  "Ranking candidate sources by priority",
  "Estimating business value & availability",
  "Preparing your recommendations",
];

/**
 * "AI is working" indicator built on the Precision-gear brand mark.
 * Defaults to a full-screen overlay; pass fullscreen={false} to render inline.
 * Cycles reassuring status lines so the wait reads as progress, not a freeze.
 */
export default function AiThinking({
  title = "AI Source Advisor is analysing",
  steps = DEFAULT_STEPS,
  fullscreen = true,
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % steps.length), 1900);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div
      className={fullscreen ? "ait-overlay" : "ait-inline"}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ait-box">
        <div className="ait-med"><GearMark /></div>
        <div className="ait-title">{title}<span className="ait-dots" /></div>
        <div className="ait-sub" key={i}>{steps[i]}</div>
        <div className="ait-hint">
          This can take a few seconds — the assistant is working, not stuck.
        </div>
      </div>
    </div>
  );
}
