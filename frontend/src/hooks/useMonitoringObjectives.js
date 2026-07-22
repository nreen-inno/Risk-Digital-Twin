import { useCallback, useEffect, useRef, useState } from "react";
import { getMonitoringObjectives } from "../services/api.js";

/**
 * Loads Monitoring Objectives and exposes a small state machine the screen can
 * render directly: status ∈ "loading" | "empty" | "error" | "ready".
 * Provides a `reload` for the retry button.
 */
export function useMonitoringObjectives() {
  const [status, setStatus] = useState("loading");
  const [objectives, setObjectives] = useState([]);
  const [error, setError] = useState(null);
  const acRef = useRef(null);

  const load = useCallback(async () => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setStatus("loading");
    setError(null);
    try {
      const data = await getMonitoringObjectives({ signal: ac.signal });
      if (ac.signal.aborted) return;
      setObjectives(data);
      setStatus(data.length ? "ready" : "empty");
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    return () => acRef.current?.abort();
  }, [load]);

  return { status, objectives, error, reload: load };
}
