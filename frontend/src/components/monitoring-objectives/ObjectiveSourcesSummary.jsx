/**
 * Compact count strip for the workspace header: In use / Setup in progress /
 * Disabled. Counts come from the backend (never hardcoded).
 */
export default function ObjectiveSourcesSummary({ counts }) {
  const items = [
    { key: "active", label: "In use", value: counts.active, tone: "use" },
    { key: "draft", label: "Setup in progress", value: counts.draft, tone: "setup" },
    { key: "disabled", label: "Disabled", value: counts.disabled, tone: "off" },
  ];
  return (
    <div className="wsum">
      {items.map((it) => (
        <div className={`wsum__item wsum__item--${it.tone}`} key={it.key}>
          <div className="wsum__num">{it.value}</div>
          <div className="wsum__label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
