import { useCallback, useEffect, useRef, useState } from "react";
import { getSourceRecommendations } from "../services/api.js";

/**
 * Requests the AI Source Advisor assessment for an objective and exposes a
 * small state machine: status ∈ "loading" | "error" | "ready". `reload` retries.
 */
export function useSourceRecommendations(objectiveId) {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const acRef = useRef(null);

  const load = useCallback(async () => {
    if (!objectiveId) {
      setStatus("error");
      setError({ message: "No objective id provided.", status: 400 });
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
      setData(result);
      setStatus("ready");
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err);
      setStatus("error");
    }
  }, [objectiveId]);

  useEffect(() => {
    load();
    return () => acRef.current?.abort();
  }, [load]);

  return { status, data, error, reload: load };
}
