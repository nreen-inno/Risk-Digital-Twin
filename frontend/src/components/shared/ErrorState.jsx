import { OfflineIcon } from "../../lib/icons.jsx";
import Button from "./Button.jsx";
import { API_BASE_URL } from "../../services/api.js";

/**
 * Failure surface. Distinguishes "backend unavailable" (network) from a
 * generic error, and always offers a retry.
 */
export default function ErrorState({ error, onRetry }) {
  const network = error?.isNetwork;
  return (
    <div className="state">
      <div className="state__icon state__icon--danger">
        <OfflineIcon />
      </div>
      <h3>{network ? "Backend unavailable" : "Something went wrong"}</h3>
      <p>
        {network
          ? "We couldn’t reach the Risk Digital Twin backend. Check that the service is running and reachable, then try again."
          : error?.message || "An unexpected error occurred while loading monitoring objectives."}
      </p>
      <span className="state__code">
        {network ? `GET ${API_BASE_URL}/api/monitoring-capabilities` : `Error${error?.status ? " " + error.status : ""}`}
      </span>
      <div>
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
