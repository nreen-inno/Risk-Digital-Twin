import { useState } from "react";
import { addInformationSource } from "../../services/api.js";
import { PlusIcon } from "../../lib/icons.jsx";

const KINDS = [
  { value: "commercialService", label: "Commercial service" },
  { value: "publicService", label: "Public service" },
  { value: "internalSystem", label: "Internal system" },
  { value: "fileUpload", label: "File upload" },
  { value: "restApi", label: "REST API" },
  { value: "manual", label: "Manual entry" },
];

/**
 * Add a source manually — never invokes AI. Opens a small form using existing
 * InformationSource fields and persists via POST /api/information-sources. The
 * new source lands in "Setup in progress"; the parent refreshes on success.
 */
export default function AddSourceMenu({ objectiveId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", provider: "", sourceKind: "commercialService", informationNeed: "" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await addInformationSource(objectiveId, form);
      if (!res.ok) throw new Error("The source could not be created.");
      setForm({ name: "", provider: "", sourceKind: "commercialService", informationNeed: "" });
      setOpen(false);
      onAdded(res);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button className="btn btn--ghost mai__addbtn" onClick={() => setOpen(true)}>
        <PlusIcon width={15} height={15} /> Add source manually
      </button>
    );
  }

  return (
    <form className="madd" onSubmit={submit}>
      <div className="madd__head">
        <h4>Add source manually</h4>
        <span className="madd__note">No AI is used — this creates a source in “Setup in progress”.</span>
      </div>

      <div className="madd__grid">
        <label className="madd__field madd__field--full">
          <span>Source name *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Internal ERP procurement export"
            autoFocus
          />
        </label>
        <label className="madd__field">
          <span>Provider</span>
          <input
            type="text"
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            placeholder="e.g. SAP"
          />
        </label>
        <label className="madd__field">
          <span>Source kind</span>
          <select value={form.sourceKind} onChange={(e) => set("sourceKind", e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <label className="madd__field madd__field--full">
          <span>Information need</span>
          <input
            type="text"
            value={form.informationNeed}
            onChange={(e) => set("informationNeed", e.target.value)}
            placeholder="What should this source tell us?"
          />
        </label>
      </div>

      {error && (
        <div className="madd__err">
          {error.isNetwork
            ? "Couldn’t reach the backend. Your details are kept — please try again."
            : "Couldn’t create the source. Your details are kept — please try again."}
        </div>
      )}

      <div className="madd__actions">
        <button type="submit" className="btn btn--primary" disabled={!form.name.trim() || saving}>
          {saving ? "Adding…" : "Add source"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
