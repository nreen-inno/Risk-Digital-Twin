const TIERS = {
  internal: { label: "Internal Sources", color: "var(--tier-internal)" },
  external: { label: "External Sources", color: "var(--tier-external)" },
  historical: { label: "Historical Sources", color: "var(--tier-historical)" },
};

/** One tier of information sources within an objective card. */
export default function SourceGroup({ tier, items }) {
  if (!items || items.length === 0) return null;
  const meta = TIERS[tier];
  return (
    <div className="srcgroup">
      <div className="srcgroup__head">
        <i style={{ background: meta.color }} />
        {meta.label}
        <span className="srcgroup__count">{items.length}</span>
      </div>
      <div className="srcgroup__items">
        {items.map((name) => (
          <span className="srcitem" key={name}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
