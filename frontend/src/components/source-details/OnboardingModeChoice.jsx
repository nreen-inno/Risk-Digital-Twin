import { useState } from "react";

const OPTIONS = [
  {
    value: "ai",
    title: "Let AI analyse the source",
    desc: "AI identifies the source, infers the best official access method, and proposes the full connector setup. Recommended for most public sources — no technical details needed.",
  },
  {
    value: "technical",
    title: "I already have technical information",
    desc: "Paste API documentation, endpoints, a sample payload or a schema — or attach a file — and AI will analyse it into a connector specification.",
  },
];

/**
 * Entry screen for Source Onboarding.
 * "How would you like to onboard this source?" — replaces the previous
 * technical-access decision. The selected source is already known, so no
 * source name is requested.
 */
export default function OnboardingModeChoice({ onChoose }) {
  const [selected, setSelected] = useState("ai");

  return (
    <section className="sd-card surface op-card">
      <span className="eyebrow">AI source onboarding</span>
      <h2 className="sd-h2">How would you like to onboard this source?</h2>

      <div className="onb-modes" role="radiogroup" aria-label="Onboarding mode">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`onb-mode ${selected === o.value ? "onb-mode--on" : ""}`}
          >
            <input
              type="radio"
              name="onboarding-mode"
              value={o.value}
              checked={selected === o.value}
              onChange={() => setSelected(o.value)}
            />
            <span className="onb-mode__dot" aria-hidden="true" />
            <span className="onb-mode__body">
              <span className="onb-mode__t">{o.title}</span>
              <span className="onb-mode__d">{o.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="ba-actions">
        <button className="btn btn--primary" type="button" onClick={() => onChoose(selected)}>
          Continue
        </button>
      </div>
    </section>
  );
}
