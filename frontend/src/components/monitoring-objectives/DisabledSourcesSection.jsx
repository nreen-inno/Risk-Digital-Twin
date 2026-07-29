import { useState } from "react";

/**
 * Disabled sources — deliberately low-emphasis. A compact, collapsible section
 * rather than a primary tab. Renders nothing when there are none.
 */
export default function DisabledSourcesSection({ sources, onOpen, onReenable }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <section className="mdis">
      <button
        className="mdis__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Disabled sources</span>
        <span className="mdis__count">{sources.length}</span>
        <span className={`mdis__chev ${open ? "up" : ""}`}>⌄</span>
      </button>

      {open && (
        <ul className="mdis__list fade">
          {sources.map((s) => (
            <li className="mdis__row" key={s.id}>
              <div className="mdis__idline">
                <span className="mdis__name">{s.name}</span>
                {s.provider && <span className="mdis__provider">{s.provider}</span>}
              </div>
              <div className="mdis__actions">
                <button className="btn btn--quiet" onClick={() => onReenable(s)}>
                  Re-enable
                </button>
                <button className="btn btn--ghost" onClick={() => onOpen(s, "overview")}>
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
