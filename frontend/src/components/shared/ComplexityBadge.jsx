import { complexityMeta } from "../../lib/access.js";

/** Estimated connection complexity: Low / Medium / High / Unknown. */
export default function ComplexityBadge({ complexity }) {
  const m = complexityMeta(complexity);
  return (
    <span className="rd-badge" style={{ color: m.color, background: m.bg, borderColor: m.bd }}>
      <i style={{ background: m.color }} />
      {m.label} complexity
    </span>
  );
}
