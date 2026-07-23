import InformationSourceCard from "./InformationSourceCard.jsx";

const META = {
  internal: { label: "Internal Sources", color: "var(--tier-internal)" },
  external: { label: "External Sources", color: "var(--tier-external)" },
  historical: { label: "Historical Sources", color: "var(--tier-historical)" },
};

/** One tier (Internal / External / Historical) of selectable source cards. */
export default function InformationSourceGroup({ tier, sources, selected, onToggle }) {
  if (!sources || sources.length === 0) return null;
  const meta = META[tier];
  return (
    <section className="isrc-group">
      <div className="isrc-group__head">
        <i style={{ background: meta.color }} />
        <h3>{meta.label}</h3>
        <span className="isrc-group__count">{sources.length}</span>
      </div>
      <div className="isrc-grid">
        {sources.map((s) => (
          <InformationSourceCard
            key={s.id}
            source={s}
            selected={selected.has(s.id)}
            onToggle={() => onToggle(s.id)}
          />
        ))}
      </div>
    </section>
  );
}
