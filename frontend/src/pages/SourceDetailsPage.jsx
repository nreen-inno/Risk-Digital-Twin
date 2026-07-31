import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  getAccessGuidance,
  updateBusinessAccess,
  getConnectorAdvice,
} from "../services/api.js";
import { buildBusinessAccessPayload } from "../lib/access.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Toast from "../components/shared/Toast.jsx";
import SourceOverview from "../components/source-details/SourceOverview.jsx";
import OnboardingModeChoice from "../components/source-details/OnboardingModeChoice.jsx";
import AiFirstOnboarding from "../components/source-details/AiFirstOnboarding.jsx";
import TechnicalInfoOnboarding from "../components/source-details/TechnicalInfoOnboarding.jsx";
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
 * Source Onboarding — AI-first connector onboarding.
 * The user first chooses an onboarding mode, then either lets AI analyse the
 * source or provides technical information. Both modes reuse the SAME existing
 * AI path (stash the instruction in business-access notes → POST
 * /connector-advice); no new backend API and no mock AI.
 */
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
  const [mode, setMode] = useState(null); // null | "ai" | "technical"
  const [advice, setAdvice] = useState({ status: "idle", data: null, error: null });
  const [accepted, setAccepted] = useState(false);

  // Load access guidance once, only to resolve a display name for the overview.
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

  // Run (or re-run) the AI analysis with a plain instruction string, reusing the
  // existing connector-advice path. Called explicitly by each onboarding mode.
  const runAnalysis = useCallback(
    async (instruction) => {
      setAccepted(false);
      setAdvice({ status: "loading", data: null, error: null });
      try {
        await updateBusinessAccess(id, buildBusinessAccessPayload("unknown", instruction));
        const data = await getConnectorAdvice(id);
        setAdvice({ status: "ready", data, error: null });
        return true;
      } catch (error) {
        setAdvice({ status: "error", data: null, error });
        setToast(
          error?.isNetwork
            ? "Couldn’t reach the backend. Please try again."
            : "AI could not complete the analysis. Please try again."
        );
        return false;
      }
    },
    [id]
  );

  const acceptSpecification = useCallback(() => {
    setAccepted(true);
    setToast("Accepted as Connector Specification — ready for connector generation.");
  }, []);

  const changeMode = () => {
    setMode(null);
    setAdvice({ status: "idle", data: null, error: null });
    setAccepted(false);
  };

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
            <button className="adv-head__back" onClick={goBack} aria-label="Back">
              ← Back
            </button>
            <span className="eyebrow">Source onboarding</span>
          </div>
        </section>

        <div className="sd-stack">
          <SourceOverview recommendation={overviewRec} availabilityLabel={availabilityLabel} />

          {!mode && <OnboardingModeChoice onChoose={setMode} />}

          {mode === "ai" && (
            <AiFirstOnboarding
              recommendation={overviewRec}
              objectiveId={objectiveId}
              advice={advice}
              accepted={accepted}
              onRun={runAnalysis}
              onAccept={acceptSpecification}
              onChangeMode={changeMode}
            />
          )}

          {mode === "technical" && (
            <TechnicalInfoOnboarding
              recommendation={overviewRec}
              objectiveId={objectiveId}
              advice={advice}
              accepted={accepted}
              onRun={runAnalysis}
              onAccept={acceptSpecification}
              onChangeMode={changeMode}
            />
          )}
        </div>
      </main>

      <Footer />
      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
