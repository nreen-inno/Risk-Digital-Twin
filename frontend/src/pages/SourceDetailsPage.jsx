import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  getAccessGuidance,
  updateBusinessAccess,
  getConnectorAdvice,
} from "../services/api.js";
import { accessKind } from "../lib/access.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Toast from "../components/shared/Toast.jsx";
import SourceOverview from "../components/source-details/SourceOverview.jsx";
import BusinessAccessForm from "../components/source-details/BusinessAccessForm.jsx";
import AccessGuidancePanel from "../components/source-details/AccessGuidancePanel.jsx";
import ConnectorAdvicePanel from "../components/source-details/ConnectorAdvicePanel.jsx";
import "../styles/source-details.css";

function readContext(id, state) {
  if (state && state.recommendation) return state;
  try {
    const raw = sessionStorage.getItem(`rdt.sourceDetails.${id}`);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Source Details — Sprint 3.
 * Overview + Business Access + Access Guidance + AI Connector Advice for an
 * accepted Information Source. All network calls go through services/api.js.
 */
export default function SourceDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const context = useMemo(() => readContext(id, location.state), [id, location.state]);
  const recommendation = context.recommendation || null;
  const objectiveId = context.objectiveId || "";

  const [toast, setToast] = useState("");
  const [guidance, setGuidance] = useState({ status: "idle", data: null, error: null });
  const [savedOnce, setSavedOnce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [advice, setAdvice] = useState({ status: "idle", data: null, error: null });

  // --- Access guidance ---
  const loadGuidance = useCallback(async () => {
    setGuidance((g) => ({ ...g, status: "loading", error: null }));
    try {
      const data = await getAccessGuidance(id);
      setGuidance({ status: "ready", data, error: null });
    } catch (err) {
      setGuidance({ status: "error", data: null, error: err });
    }
  }, [id]);

  useEffect(() => {
    loadGuidance();
  }, [loadGuidance]);

  // Availability drives which business questions we ask.
  const availabilityStatus =
    (recommendation && (recommendation.raw?.availabilityStatus || recommendation.availabilityStatusRaw)) ||
    guidance.data?.availabilityStatus ||
    "";
  const kind = accessKind(availabilityStatus);

  // --- Save business access ---
  const handleSave = async (payload) => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateBusinessAccess(id, payload);
      setSavedOnce(true);
      setToast("Business access saved.");
      await loadGuidance(); // refresh guidance from the new answers
    } catch (err) {
      setSaveError(err);
      setToast(
        err && err.isNetwork
          ? "Couldn’t reach the backend — your answers are kept."
          : "Couldn’t save — your answers are kept. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // --- Connector advice ---
  const getAdvice = async () => {
    setAdvice({ status: "loading", data: null, error: null });
    try {
      const data = await getConnectorAdvice(id);
      setAdvice({ status: "ready", data, error: null });
    } catch (err) {
      setAdvice({ status: "error", data: null, error: err });
    }
  };

  const goBack = () =>
    objectiveId
      ? navigate(`/configure/objectives/${encodeURIComponent(objectiveId)}/source-advisor`)
      : navigate("/configure/objectives");

  const overviewRec =
    recommendation || { sourceName: guidance.data?.sourceName || "Information source" };
  const availabilityLabel = recommendation?.availabilityLabel || "";
  const hasSaved = savedOnce || !!guidance.data?.businessAccess?.decisionStatus;

  return (
    <div className="app">
      <TopBar />

      <main className="container">
        <section className="adv-head surface fade-in">
          <div className="adv-head__top">
            <button className="adv-head__back" onClick={goBack} aria-label="Back to source advisor">
              ← Back
            </button>
            <span className="eyebrow">Step 3 · Source details</span>
          </div>
        </section>

        <div className="sd-stack">
          <SourceOverview recommendation={overviewRec} availabilityLabel={availabilityLabel} />

          <BusinessAccessForm
            kind={kind}
            initial={guidance.data?.businessAccess}
            onSave={handleSave}
            saving={saving}
            error={saveError}
          />

          <AccessGuidancePanel
            guidance={guidance.data?.guidance}
            status={guidance.status}
            error={guidance.error}
            onRetry={loadGuidance}
            hasSaved={hasSaved}
          />

          <ConnectorAdvicePanel
            advice={advice.data}
            status={advice.status}
            error={advice.error}
            onGenerate={getAdvice}
            onRetry={getAdvice}
          />
        </div>
      </main>

      <Footer />

      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
