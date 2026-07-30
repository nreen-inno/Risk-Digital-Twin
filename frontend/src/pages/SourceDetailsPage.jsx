import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  getAccessGuidance,
  updateBusinessAccess,
  getConnectorAdvice,
} from "../services/api.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Toast from "../components/shared/Toast.jsx";
import SourceOverview from "../components/source-details/SourceOverview.jsx";
import ConnectorOnboardingProposal from "../components/source-details/ConnectorOnboardingProposal.jsx";
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

export default function SourceDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const context = useMemo(() => readContext(id, location.state), [id, location.state]);
  const recommendation = context.recommendation || null;
  const objectiveId = context.objectiveId || "";
  const backTo = context.backTo || "";

  const [toast, setToast] = useState("");
  const [guidance, setGuidance] = useState({ status: "idle", data: null, error: null });
  const [saving, setSaving] = useState(false);
  const [advice, setAdvice] = useState({ status: "idle", data: null, error: null });

  const loadGuidance = useCallback(async () => {
    setGuidance((current) => ({ ...current, status: "loading", error: null }));
    try {
      const data = await getAccessGuidance(id);
      setGuidance({ status: "ready", data, error: null });
    } catch (error) {
      setGuidance({ status: "error", data: null, error });
    }
  }, [id]);

  useEffect(() => {
    loadGuidance();
  }, [loadGuidance]);

  const saveAndGenerateProposal = useCallback(async (payload) => {
    setSaving(true);
    setAdvice({ status: "loading", data: null, error: null });
    try {
      await updateBusinessAccess(id, payload);
      const data = await getConnectorAdvice(id);
      setAdvice({ status: "ready", data, error: null });
      await loadGuidance();
      return true;
    } catch (error) {
      setAdvice({ status: "error", data: null, error });
      setToast(
        error?.isNetwork
          ? "Couldn’t reach the backend. Your source remains in onboarding."
          : "AI could not prepare the proposal. Please try again."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, loadGuidance]);

  const goBack = () => {
    if (backTo) return navigate(backTo);
    if (objectiveId) {
      return navigate(`/configure/objectives/${encodeURIComponent(objectiveId)}/source-advisor`);
    }
    return navigate("/configure/objectives");
  };

  const overviewRec = recommendation || {
    sourceName: guidance.data?.sourceName || "Information source",
  };
  const availabilityLabel = recommendation?.availabilityLabel || "";

  return (
    <div className="app">
      <TopBar />

      <main className="container">
        <section className="adv-head surface fade-in">
          <div className="adv-head__top">
            <button className="adv-head__back" onClick={goBack} aria-label="Back to source onboarding">
              ← Back
            </button>
            <span className="eyebrow">Source onboarding</span>
          </div>
        </section>

        <div className="sd-stack">
          <SourceOverview recommendation={overviewRec} availabilityLabel={availabilityLabel} />

          <ConnectorOnboardingProposal
            sourceId={id}
            recommendation={overviewRec}
            objectiveId={objectiveId}
            initialAccess={guidance.data?.businessAccess}
            guidanceStatus={guidance.status}
            advice={advice}
            saving={saving}
            onGenerateProposal={saveAndGenerateProposal}
          />
        </div>
      </main>

      <Footer />
      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
