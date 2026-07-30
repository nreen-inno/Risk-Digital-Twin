import { useEffect, useState } from "react";
import {
  ANSWER_OPTIONS,
  buildBusinessAccessPayload,
  primaryAnswerFromBusinessAccess,
} from "../../lib/access.js";

/**
 * Collects technical-access availability and flexible, source-specific access
 * information. Secrets are explicitly excluded and will be requested later by
 * the generated connector through a secure configuration interface.
 */
export default function BusinessAccessForm({
  initial,
  onNeedAdvice,
  onAnalyse,
  saving,
  analysing,
  error,
}) {
  const [answer, setAnswer] = useState("");
  const [accessInformation, setAccessInformation] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [adviceRequested, setAdviceRequested] = useState(false);

  useEffect(() => {
    if (!initial) return;
    const storedAnswer = primaryAnswerFromBusinessAccess(initial);
    setAnswer(storedAnswer);
    setAccessInformation(initial.notes || "");
    if (storedAnswer === "yes" || initial.notes) setShowForm(true);
  }, [initial]);

  const chooseAnswer = async (value) => {
    setAnswer(value);
    if (value === "yes") {
      setShowForm(true);
      setAdviceRequested(false);
      return;
    }

    setShowForm(false);
    setAdviceRequested(true);
    await onNeedAdvice(buildBusinessAccessPayload(value, accessInformation));
  };

  const submit = (e) => {
    e.preventDefault();
    onAnalyse(buildBusinessAccessPayload(answer || "yes", accessInformation));
  };

  const canAnalyse =
    !saving && !analysing && !!answer && accessInformation.trim().length >= 10;

  return (
    <section className="sd-card surface">
      <span className="eyebrow">Technical access</span>
      <h2 className="sd-h2">Is technical access already available?</h2>
      <p className="sd-muted sd-access-intro">
        Choose Yes when your organisation already knows how the source can be reached.
        Choose No / Not sure when you need AI guidance on what to ask the owner or provider.
      </p>

      <div className="ba-choices" role="radiogroup" aria-label="Is technical access already available?">
        {ANSWER_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`ba-choice ${answer === opt.value ? "ba-choice--on" : ""}`}
          >
            <input
              type="radio"
              name="technical-access-answer"
              value={opt.value}
              checked={answer === opt.value}
              disabled={saving || analysing}
              onChange={() => chooseAnswer(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {adviceRequested && analysing && (
        <div className="sd-inline-load sd-access-transition">
          <span className="sd-spinner" aria-hidden="true" />
          AI is preparing questions for the source owner or provider…
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="ba-form ba-access-form fade">
          <div>
            <span className="eyebrow">Access information</span>
            <h3 className="sd-guide__title">Tell us what you already know</h3>
            <p className="sd-muted">
              Ask the internal owner or service provider for the information needed to
              connect this data source, then paste everything you know below.
            </p>
          </div>

          <div className="ba-guidance-box">
            <div className="sd-block-h">Useful information may include</div>
            <ul className="sd-plain-list ba-guidance-list">
              <li>API or service URL</li>
              <li>Authentication type, such as OAuth2, API key, certificate, username/password, or managed identity</li>
              <li>Documentation or API specification</li>
              <li>Desired polling frequency or event-based updates</li>
              <li>Available endpoints or data scope</li>
              <li>Sample response or data format</li>
              <li>Rate limits or other technical constraints</li>
              <li>Any other information that may help establish the connection</li>
            </ul>
            <p className="ba-secret-warning">
              Do not paste passwords, API keys, access tokens, certificates, or other
              secrets. The connector will request those securely later, according to
              the identified authentication type.
            </p>
          </div>

          <label className="ba-input ba-input--full">
            <span>Known access and connection information</span>
            <textarea
              rows="9"
              value={accessInformation}
              onChange={(e) => setAccessInformation(e.target.value)}
              placeholder="Example: REST API documentation is available at … Authentication uses OAuth2. The desired polling interval is every 15 minutes. Relevant endpoints are …"
            />
          </label>

          {error && <div className="ba-note ba-note--err">{error.message || "Couldn’t save the information."}</div>}

          <div className="ba-actions">
            <button className="btn btn--primary" type="submit" disabled={!canAnalyse}>
              {saving ? "Saving…" : analysing ? "Analysing…" : "Analyse Access Information"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
