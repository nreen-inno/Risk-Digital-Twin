import { useEffect, useState } from "react";
import {
  accessQuestion,
  ANSWER_OPTIONS,
  DEPARTMENTS,
  buildBusinessAccessPayload,
  primaryAnswerFromBusinessAccess,
} from "../../lib/access.js";

/**
 * B. Business Access Review — practical business questions adapted to the
 * source's access kind. Maps answers to the backend contract and PATCHes them.
 * Form values are preserved across guidance/advice failures (state lives here).
 */
export default function BusinessAccessForm({ kind, initial, onSave, saving, error }) {
  const question = accessQuestion(kind);
  const [answer, setAnswer] = useState("");
  const [fields, setFields] = useState({
    internalOwner: "",
    contactDepartment: "",
    providerPortal: "",
    notes: "",
  });
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Prefill from any previously-saved answers.
  useEffect(() => {
    if (!initial) return;
    setAnswer(primaryAnswerFromBusinessAccess(kind, initial));
    setFields({
      internalOwner: initial.internalOwner || "",
      contactDepartment: initial.contactDepartment || "",
      providerPortal: initial.providerPortal || "",
      notes: initial.notes || "",
    });
    if (initial.internalOwner || initial.contactDepartment || initial.providerPortal || initial.notes) {
      setDetailsOpen(true);
    }
  }, [initial, kind]);

  const setField = (k, v) => setFields((prev) => ({ ...prev, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSave(buildBusinessAccessPayload(kind, answer, fields));
  };

  const needsAnswer = kind !== "available";
  const canSave = !saving && (!needsAnswer || !!answer);

  return (
    <section className="sd-card surface">
      <span className="eyebrow">Business access review</span>
      <h2 className="sd-h2">Can we use this source?</h2>

      <form onSubmit={submit} className="ba-form">
        {kind === "available" && (
          <div className="ba-note ba-note--ok">
            No commercial subscription is required for this source.
          </div>
        )}

        {kind === "upload" && (
          <div className="ba-note">
            This source is provided as a file. A sample export or file will be
            required later for the connection.
          </div>
        )}

        {needsAnswer && question && (
          <fieldset className="ba-field">
            <legend className="ba-q">{question.label}</legend>
            {question.helper && <p className="ba-helper">{question.helper}</p>}
            <div className="ba-choices" role="radiogroup" aria-label={question.label}>
              {ANSWER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`ba-choice ${answer === opt.value ? "ba-choice--on" : ""}`}
                >
                  <input
                    type="radio"
                    name="access-answer"
                    value={opt.value}
                    checked={answer === opt.value}
                    onChange={() => setAnswer(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <button
          type="button"
          className="ba-disclose"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? "Hide optional details" : "Add owner, department & notes (optional)"}
          <span className={`rec__chev ${detailsOpen ? "up" : ""}`}>⌄</span>
        </button>

        {detailsOpen && (
          <div className="ba-optional fade">
            <label className="ba-input">
              <span>Internal owner</span>
              <input
                type="text"
                value={fields.internalOwner}
                onChange={(e) => setField("internalOwner", e.target.value)}
                placeholder="e.g. Finance"
              />
            </label>
            <label className="ba-input">
              <span>Responsible department</span>
              <select
                value={fields.contactDepartment}
                onChange={(e) => setField("contactDepartment", e.target.value)}
              >
                <option value="">Select…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="ba-input">
              <span>Provider portal</span>
              <input
                type="text"
                value={fields.providerPortal}
                onChange={(e) => setField("providerPortal", e.target.value)}
                placeholder="e.g. https://portal.provider.com"
              />
            </label>
            <label className="ba-input ba-input--full">
              <span>Notes</span>
              <textarea
                rows={2}
                value={fields.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Anything useful for the next step…"
              />
            </label>
          </div>
        )}

        {error && (
          <div className="ba-note ba-note--err">
            Couldn’t save your answers. Your input is kept — please try again.
          </div>
        )}

        <div className="ba-actions">
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            {saving ? "Saving…" : kind === "available" ? "Confirm & continue" : "Save & continue"}
          </button>
        </div>
      </form>
    </section>
  );
}
