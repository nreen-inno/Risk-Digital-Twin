import { useCallback, useEffect, useRef, useState } from "react";
import { getMonitoringObjectiveInformationSources } from "../services/api.js";

const EMPTY = {
  objectiveId: "",
  active: [],
  draft: [],
  disabled: [],
  counts: { active: 0, draft: 0, disabled: 0 },
};

/**
 * Loads the Information Sources attached to one Monitoring Objective, grouped
 * into active / draft / disabled with backend counts. Exposes a small state
 * machine (status ∈ "loading" | "error" | "ready") plus `reload` for retry and
 * `refresh` to re-pull after accepting a recommendation or adding a source.
 *
 * Empty active/draft is a valid "ready" state — the UI shows tailored empty
 * states rather than an error. Only a failed request is "error".
 */
export function useMonitoringObjectiveSources(objectiveId) {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(EMPTY);
  const [error, setError] = useState(null);
  const acRef = useRef(null);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!objectiveId) {
        setStatus("error");
        setError({ message: "No objective id provided.", status: 400 });
        return;
      }
      acRef.current?.abort();
      const ac = new AbortController();
      acRef.current = ac;

      if (!quiet) setStatus("loading");
      setError(null);
      try {
        const result = await getMonitoringObjectiveInformationSources(objectiveId, { signal: ac.signal });
        if (ac.signal.aborted) return;
        setData(result || EMPTY);
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

  // reload = user-facing retry (shows loading); refresh = quiet re-pull that
  // keeps the current lists on screen while it updates (used after Accept/Add).
  const reload = useCallback(() => load(), [load]);
  const refresh = useCallback(() => load({ quiet: true }), [load]);

  return { status, data, error, reload, refresh };
}
