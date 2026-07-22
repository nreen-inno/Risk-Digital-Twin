import { SparkIcon } from "../../lib/icons.jsx";

/**
 * The opening statement of the platform. Business language only — the user
 * declares intent ("what to monitor"), the platform will do the ontology work.
 */
export default function Hero() {
  return (
    <section className="hero">
      <span className="eyebrow">
        <SparkIcon /> Platform setup · Step 1 of 4
      </span>

      <h1>
        What would you like to <span className="grad">monitor?</span>
      </h1>

      <p>
        Select a monitoring objective. Our AI will recommend the relevant
        enterprise risks, information sources and connector configurations —
        integrating internal operations with external market and geopolitical
        intelligence.
      </p>

      <div className="hero__meta">
        <span className="chip chip--dot" style={{ color: "var(--tier-internal)" }}>
          AI-assisted configuration
        </span>
        <span className="chip chip--dot" style={{ color: "var(--tier-external)" }}>
          Internal &amp; external data
        </span>
        <span className="chip chip--dot" style={{ color: "var(--tier-historical)" }}>
          Industrial operations
        </span>
      </div>
    </section>
  );
}
