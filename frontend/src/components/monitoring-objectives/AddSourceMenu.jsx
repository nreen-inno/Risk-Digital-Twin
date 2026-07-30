import { useState } from "react";
import { addInformationSource } from "../../services/api.js";
import { PlusIcon, SparkIcon } from "../../lib/icons.jsx";

const KINDS = [
  { value: "internalSystem", label: "Internal system" },
  { value: "publicService", label: "Public or news source" },
  { value: "commercialService", label: "Commercial service" },
  { value: "restApi", label: "API or web service" },
  { value: "fileUpload", label: "File or export" },
  { value: "manual", label: "Other / not sure" },
];

export default function AddSourceMenu({ objectiveId, onAdded, onAskAi }) {
  const [mode, setMode] = useState("choose");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    provider: "",
    sourceKind: "manual",
    informationNeed: "",
    connectionContext: "",
  });

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await addInformationSource(objectiveId, form);
      if (!result.ok || !result.id) throw new Error("The source could not be created.");
      try {
        sessionStorage.setItem(
          `rdt.sourceOnboarding.${result.id}`,
          JSON.stringify({
            reason: "Source added by the risk manager",
            connectionContext: form.connectionContext.trim(),
            informationNeed: form.informationNeed.trim(),
          })
        );
      } catch {
        /* storage unavailable */
      }
      setForm({ name: "", provider: "", sourceKind: "manual", informationNeed: "", connectionContext: "" });
      setMode("choose");
      onAdded(result);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (mode === "choose") {
    return (
      <section className="madd madd--choice madd--tab">
        <div className="madd__head">
          <span className="eyebrow">Add source</span>
          <h3>Add a new monitoring source</h3>
          <span className="madd__note">Choose the path that matches what you already know.</span>
        </div>
        <div className="madd__choices">
          <button type="button" className="madd__choice" onClick={() => setMode("known")}>
            <span className="madd__choice-icon"><PlusIcon width={18} height={18} /></span>
            <span>
              <strong>I have a source in mind</strong>
              <small>Describe an internal system, website, feed, API, file or service. It will move directly to Source onboarding.</small>
            </span>
          </button>
          <button type="button" className="madd__choice" onClick={onAskAi}>
            <span className="madd__choice-icon"><SparkIcon width={18} height={18} /></span>
            <span>
              <strong>Ask AI to recommend sources</strong>
              <small>Let AI assess coverage gaps and identify suitable internal or external sources.</small>
            </span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="madd madd--tab" onSubmit={submit}>
      <div className="madd__head">
        <span className="eyebrow">Add source</span>
        <h3>I have a source in mind</h3>
        <span className="madd__note">Describe what you know. The source will be added to Source onboarding.</span>
      </div>

      <div className="madd__grid">
        <label className="madd__field madd__field--full">
          <span>Source name *</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. YLE News, SAP S/4HANA, Azure Data Lake" autoFocus />
        </label>
        <label className="madd__field">
          <span>Provider or owner</span>
          <input value={form.provider} onChange={(e) => set("provider", e.target.value)} placeholder="e.g. YLE, SAP, Meyer Turku" />
        </label>
        <label className="madd__field">
          <span>What kind of source is it?</span>
          <select value={form.sourceKind} onChange={(e) => set("sourceKind", e.target.value)}>
            {KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
          </select>
        </label>
        <label className="madd__field madd__field--full">
          <span>What should it help monitor?</span>
          <textarea value={form.informationNeed} onChange={(e) => set("informationNeed", e.target.value)} placeholder="e.g. Finnish political and regulatory developments relevant to shipbuilding and Meyer Turku" rows={3} />
        </label>
        <label className="madd__field madd__field--full">
          <span>What do you already know about access or connection?</span>
          <textarea value={form.connectionContext} onChange={(e) => set("connectionContext", e.target.value)} placeholder="Optional: URL, portal, API, RSS feed, file location, system owner, available credentials, or simply ‘I do not know yet’." rows={4} />
        </label>
      </div>

      {error && <div className="madd__err">Couldn’t add the source. Your details are kept — please try again.</div>}

      <div className="madd__actions">
        <button type="submit" className="btn btn--primary" disabled={!form.name.trim() || saving}>
          {saving ? "Adding…" : "Add to Source onboarding"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setMode("choose")} disabled={saving}>Back</button>
      </div>
    </form>
  );
}
