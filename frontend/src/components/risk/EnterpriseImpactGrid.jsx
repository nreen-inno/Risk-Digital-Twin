import { useState } from "react";

function normConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Enterprise impact tiles with optional explain (A+B).
 * Hover: plain-language definition. Click: calculation panel.
 * Tiles without explain render as plain value/label (backward compatible).
 */
export default function EnterpriseImpactGrid({ impacts = [] }) {
  const [openIndex, setOpenIndex] = useState(null);
  const list = Array.isArray(impacts) ? impacts : [];
  const open = openIndex != null ? list[openIndex] : null;
  const explain = open?.explain;

  if (!list.length) return null;

  return (
    <div className="risk-impacts-wrap">
      <p className="risk-impacts__hint">
        Hover a tile for the definition · click for the calculation
      </p>
      <div className="risk-impacts">
        {list.map((im, i) => {
          const x = im.explain;
          const conf = normConfidence(x?.confidence);
          const interactive = Boolean(x);
          const isOn = openIndex === i;
          return (
            <div
              key={im.label || i}
              className={`risk-impact${interactive ? " risk-impact--int" : ""}${isOn ? " is-on" : ""}`}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-expanded={interactive ? isOn : undefined}
              aria-label={
                interactive
                  ? `${im.label} — show calculation`
                  : undefined
              }
              onClick={() => {
                if (!interactive) return;
                setOpenIndex((cur) => (cur === i ? null : i));
              }}
              onKeyDown={(e) => {
                if (!interactive) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenIndex((cur) => (cur === i ? null : i));
                }
              }}
            >
              {interactive && <span className="risk-impact__i">i</span>}
              <div className="risk-impact__v">{im.value}</div>
              <div className="risk-impact__l">{im.label}</div>
              {conf != null && (
                <div className="risk-impact__conf">
                  <small>Confidence {conf}%</small>
                  <span className="risk-impact__bar">
                    <i style={{ width: `${conf}%` }} />
                  </span>
                </div>
              )}
              {x?.what && (
                <div className="risk-impact__tt">
                  <b>{im.label}.</b> {x.what}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {explain && open && (
        <div className="risk-impd" aria-live="polite">
          <div className="risk-impd__top">
            <span className="risk-impd__v">{open.value}</span>
            <span className="risk-impd__l">{open.label}</span>
          </div>
          {explain.what && (
            <>
              <div className="risk-impd__h">What it means</div>
              <p className="risk-impd__what">{explain.what}</p>
            </>
          )}
          {explain.formula && (
            <>
              <div className="risk-impd__h">How it&apos;s calculated</div>
              <div className="risk-impd__f">{explain.formula}</div>
            </>
          )}
          {Array.isArray(explain.inputs) && explain.inputs.length > 0 && (
            <>
              <div className="risk-impd__h">Inputs</div>
              <div className="risk-impd__in">
                {explain.inputs.map((row, idx) => (
                  <div className="risk-impd__row" key={`${row.k}-${idx}`}>
                    <span className="risk-impd__k">{row.k}</span>
                    <span className="risk-impd__val">{row.v}</span>
                    {(row.source || row.src) && (
                      <span className="risk-impd__src">
                        {row.source || row.src}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {explain.result && (
            <div className="risk-impd__res">{explain.result}</div>
          )}
          {Array.isArray(explain.assumptions) && explain.assumptions.length > 0 && (
            <>
              <div className="risk-impd__h">Assumptions</div>
              <ul className="risk-impd__as">
                {explain.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          )}
          <div className="risk-impd__foot">
            {Array.isArray(explain.sources) && explain.sources.length > 0 && (
              <span>Sources: {explain.sources.join(" · ")}</span>
            )}
            {(explain.updated || explain.upd) && (
              <span>Updated {explain.updated || explain.upd}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
