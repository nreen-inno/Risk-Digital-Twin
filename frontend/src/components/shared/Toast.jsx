import { useEffect } from "react";
import { SparkIcon } from "../../lib/icons.jsx";

/**
 * Lightweight, auto-dismissing toast used for the "coming next" placeholders.
 * Deliberately calm — this platform doesn't shout.
 */
export default function Toast({ message, onDismiss, duration = 3200 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDismiss]);

  if (!message) return null;
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className="toast">
        <i>
          <SparkIcon />
        </i>
        <span>{message}</span>
      </div>
    </div>
  );
}
