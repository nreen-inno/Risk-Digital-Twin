import { useCallback, useEffect, useRef, useState } from "react";
import { getSourceRecommendations } from "../services/api.js";

/**
 * In-memory cache of successful advisor assessments, keyed by objectiveId.
 * Lets the user return from a source drill-down (Back) without re-running the
 * AI Source Advisor — the previous result is served instantly, so the
 * "AI is analysing" overlay only appears on the first, genuine assessment.
 * Cleared on a full page reload; `reload({ force })` always re-fetches.
 */
const assessmentCache = new Map();

/**
 * Requests the AI Source Advisor assessment for an objective and exposes a
 * small state machine: status ∈ "loading" | "error" | "ready". `reload` forces
 * a fresh assessment (used by Retry).
 */
export function useSourceRecommendations(objectiveId) {
  const cached = objectiveId ? assessmentCache.get(objectiveId) : null;
  const [status, setStatus] = useState(cached ? "ready" : "loading");
  const [data, setData] = useState(cached || null);
  const [error, setError] = useState(null);
  const acRef = useRef(null);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!objectiveId) {
        setStatus("error");
        setError({ message: "No objective id provided.", status: 400 });
        return;
      }

      // Serve a previously-computed assessment instantly (no loading overlay)
      // unless a refresh is explicitly forced.
      if (!force && assessmentCache.has(objectiveId)) {
        setData(assessmentCache.get(objectiveId));
        setError(null);
        setStatus("ready");
        return;
      }

      acRef.current?.abort();
      const ac = new AbortController();
      acRef.current = ac;

      setStatus("loading");
      setError(null);
      try {
        const result = await getSourceRecommendations(objectiveId, { signal: ac.signal });
        if (ac.signal.aborted) return;
        assessmentCache.set(objectiveId, result);
        setData(result);
        setStatus("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err);
        setStatus("error");
      }
    },
    [objectiveId]
  );

  useEffect(() => {
    load();
    return () => acRef.current?.abort();
  }, [load]);

  // Retry always forces a fresh assessment, ignoring any click-event argument.
  const reload = useCallback(() => load({ force: true }), [load]);

  return { status, data, error, reload };
}
