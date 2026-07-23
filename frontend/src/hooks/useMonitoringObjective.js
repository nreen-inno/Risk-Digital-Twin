import { useCallback, useEffect, useRef, useState } from "react";
import { getMonitoringObjectiveById } from "../services/api.js";

/**
 * Loads a single Monitoring Objective by id and exposes a small state machine:
 * status ∈ "loading" | "error" | "ready". Provides `reload` for retry.
 * Mirrors useMonitoringObjectives so both pages behave consistently.
 */
export function useMonitoringObjective(id) {
  const [status, setStatus] = useState("loading");
  const [objective, setObjective] = useState(null);
  const [error, setError] = useState(null);
  const acRef = useRef(null);

  const load = useCallback(async () => {
    if (!id) {
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
      const data = await getMonitoringObjectiveById(id, { signal: ac.signal });
      if (ac.signal.aborted) return;
      setObjective(data);
      setStatus("ready");
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err);
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => acRef.current?.abort();
  }, [load]);

  return { status, objective, error, reload: load };
}
