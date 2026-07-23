import { ObjectiveIcon } from "../../lib/icons.jsx";

/**
 * Restates the chosen Monitoring Objective at the top of the sources page:
 * name, business question, description, related risk factors and risk
 * definitions — the "why" context for the source selection below.
 */
export default function ObjectiveContextHeader({ objective, onBack }) {
  return (
    <section className="ctxhead surface fade-in">
      <div className="ctxhead__top">
        <button className="ctxhead__back" onClick={onBack} aria-label="Back to monitoring objectives">
          ← Objectives
        </button>
        <span className="eyebrow">Step 2 · Information Sources</span>
      </div>

      <div className="ctxhead__main">
        <span className="ctxhead__icon">
          <ObjectiveIcon iconKey={objective.iconKey} width={26} height={26} />
        </span>
        <div>
          <h1 className="ctxhead__title">{objective.name}</h1>
          <p className="ctxhead__q">{objective.businessQuestion}</p>
          {objective.description && <p className="ctxhead__desc">{objective.description}</p>}
        </div>
      </div>

      <div className="ctxhead__cols">
        {objective.riskFactors.length > 0 && (
          <div>
            <div className="obj__section-label">Related risk factors</div>
            <div className="factors">
              {objective.riskFactors.map((f) => (
                <span className="factor" key={f}>{f}</span>
              ))}
            </div>
          </div>
        )}
        {objective.riskDefinitions.length > 0 && (
          <div>
            <div className="obj__section-label">Related risk definitions</div>
            <div className="factors">
              {objective.riskDefinitions.map((d) => (
                <span className="riskdef" key={d}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
