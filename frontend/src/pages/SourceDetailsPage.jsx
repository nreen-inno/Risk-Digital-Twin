import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  getAccessGuidance,
  updateBusinessAccess,
  getConnectorAdvice,
  acceptConnectorSpecification,
  testConnector,
  getSourceRawRecords,
  approveSourceSample,
} from "../services/api.js";
import { buildBusinessAccessPayload } from "../lib/access.js";
import TopBar from "../components/layout/TopBar.jsx";
import Footer from "../components/layout/Footer.jsx";
import Toast from "../components/shared/Toast.jsx";
import SourceOverview from "../components/source-details/SourceOverview.jsx";
import OnboardingModeChoice from "../components/source-details/OnboardingModeChoice.jsx";
import AiFirstOnboarding from "../components/source-details/AiFirstOnboarding.jsx";
import TechnicalInfoOnboarding from "../components/source-details/TechnicalInfoOnboarding.jsx";
import RawRecordsPreview from "../components/source-details/RawRecordsPreview.jsx";
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
 * Accept Spec persists Specification + Definition and, for RSS, runs a live
 * fetch into canonical RawRecords shown in the preview panel.
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
  const [accepting, setAccepting] = useState(false);
  const [sampleApproved, setSampleApproved] = useState(false);
  const [approvingSample, setApprovingSample] = useState(false);
  const [recordsState, setRecordsState] = useState({
    status: "idle",
    records: [],
    testResult: null,
    definition: null,
    verification: null,
    error: null,
  });

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

  const runAnalysis = useCallback(
    async (instruction) => {
      setAccepted(false);
      setSampleApproved(false);
      setRecordsState({
        status: "idle",
        records: [],
        testResult: null,
        definition: null,
        verification: null,
        error: null,
      });
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

  const loadRawRecords = useCallback(async () => {
    setRecordsState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const data = await getSourceRawRecords(id, { limit: 25 });
      setRecordsState((prev) => ({
        ...prev,
        status: "ready",
        records: data.items || [],
        error: null,
      }));
    } catch (error) {
      setRecordsState((prev) => ({
        ...prev,
        status: "error",
        error: error?.message || "Could not load raw records.",
      }));
    }
  }, [id]);

  const acceptSpecification = useCallback(async () => {
    if (!advice.data || accepting) return;
    setAccepting(true);
    setRecordsState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const result = await acceptConnectorSpecification(id, advice.data, {
        runTest: true,
        limit: 15,
      });
      setAccepted(true);
      setSampleApproved(false);

      const test = result.test || null;
      const testFailed = test?.error || (test?.testResult && test.testResult.ok === false);

      setRecordsState({
        status: "ready",
        records: test?.records || [],
        testResult: test?.testResult || (test?.error ? { ok: false, message: test.error } : null),
        definition: result.definition || test?.definition || null,
        verification: result.verification || null,
        error: null,
      });

      if (!test?.records?.length && result.executable) {
        await loadRawRecords();
      }

      if (testFailed) {
        setToast("Endpoint verified for build, but sample fetch needs attention. Try Fetch again.");
      } else if (result.executable) {
        setToast(
          result.verification?.endpoint
            ? `Verified ${result.verification.endpoint}. Connectivity sample below is unfiltered — approve if this is the right feed.`
            : "Connectivity sample collected (unfiltered). Approve if the feed is correct for this objective."
        );
      } else {
        setToast(
          `Specification accepted. Live fetch for adapter "${result.adapterType}" is not implemented in this demo yet.`
        );
      }
    } catch (error) {
      setRecordsState((prev) => ({
        ...prev,
        status: "error",
        verification: error?.verification || prev.verification || null,
        error: error?.message || "Accept failed.",
      }));
      setToast(
        error?.status === 400
          ? error.message || "Could not verify a working feed URL before building the connector."
          : error?.isNetwork
            ? "Couldn’t reach the backend. Please try again."
            : "Could not accept the connector specification."
      );
    } finally {
      setAccepting(false);
    }
  }, [advice.data, accepting, id, loadRawRecords]);

  const runConnectorTest = useCallback(async () => {
    setRecordsState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const result = await testConnector(id, { limit: 15 });
      setRecordsState({
        status: "ready",
        records: result.records || [],
        testResult: result.testResult || null,
        definition: result.definition || null,
        verification: null,
        error: null,
      });
      setSampleApproved(false);
      setToast(
        result.testResult?.ok
          ? "Connectivity sample refreshed (unfiltered raw feed). Approve if this is the right source."
          : result.testResult?.message || "Connector test finished with issues."
      );
    } catch (error) {
      setRecordsState((prev) => ({
        ...prev,
        status: "error",
        error: error?.message || "Connector test failed.",
      }));
      setToast(error?.message || "Connector test failed.");
    }
  }, [id]);

  const approveSample = useCallback(async () => {
    if (approvingSample) return;
    setApprovingSample(true);
    try {
      await approveSourceSample(id);
      setSampleApproved(true);
      setToast("Sample approved — source is now In use.");
    } catch (error) {
      setToast(error?.message || "Could not approve the sample.");
    } finally {
      setApprovingSample(false);
    }
  }, [approvingSample, id]);

  const rejectSample = useCallback(() => {
    setSampleApproved(false);
    setToast(
      "Sample kept out of In use. Describe changes above (scope/feed), update the proposal, then Accept again."
    );
    // Keep records visible for comparison; user updates via Describe changes.
    const el = document.getElementById("onboarding-revision");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }, []);

  const changeMode = () => {
    setMode(null);
    setAdvice({ status: "idle", data: null, error: null });
    setAccepted(false);
    setSampleApproved(false);
    setRecordsState({
      status: "idle",
      records: [],
      testResult: null,
      definition: null,
      verification: null,
      error: null,
    });
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
              accepting={accepting}
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
              accepting={accepting}
              onRun={runAnalysis}
              onAccept={acceptSpecification}
              onChangeMode={changeMode}
            />
          )}

          {(accepted || recordsState.status !== "idle") && (
            <RawRecordsPreview
              status={recordsState.status}
              records={recordsState.records}
              testResult={recordsState.testResult}
              definition={recordsState.definition}
              verification={recordsState.verification}
              error={recordsState.error}
              sampleApproved={sampleApproved}
              approving={approvingSample}
              onRefresh={loadRawRecords}
              onTest={accepted && !sampleApproved ? runConnectorTest : null}
              onApproveSample={approveSample}
              onRejectSample={rejectSample}
            />
          )}
        </div>
      </main>

      <Footer />
      <Toast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
}
