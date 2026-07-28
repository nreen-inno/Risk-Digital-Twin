import { readinessMeta } from "../../lib/access.js";

/** Readiness pill: Ready / Partially ready / Action required / Unknown. */
export default function ReadinessBadge({ readiness }) {
  const m = readinessMeta(readiness);
  return (
    <span className="rd-badge" style={{ color: m.color, background: m.bg, borderColor: m.bd }}>
      <i style={{ background: m.color }} />
      {m.label}
    </span>
  );
}
