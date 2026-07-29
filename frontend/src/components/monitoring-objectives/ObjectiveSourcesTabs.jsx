/**
 * Tab bar for the Monitoring Objective workspace. Keeps the three concepts —
 * Sources in use, Setup in progress, AI suggestions — clearly separated.
 * Controlled: parent owns the active tab.
 */
export default function ObjectiveSourcesTabs({ tabs, active, onChange }) {
  return (
    <div className="wtabs" role="tablist" aria-label="Objective sources">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            className={`wtabs__tab ${on ? "on" : ""}`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
            {typeof t.count === "number" && <span className="wtabs__count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
