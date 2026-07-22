import { InboxIcon } from "../../lib/icons.jsx";
import Button from "./Button.jsx";

/** No objectives returned by the backend. */
export default function EmptyState({ onRetry }) {
  return (
    <div className="state">
      <div className="state__icon">
        <InboxIcon />
      </div>
      <h3>No monitoring objectives available</h3>
      <p>
        The platform is connected, but no monitoring objectives were returned.
        They may still be provisioning for your organisation.
      </p>
      <Button variant="ghost" onClick={onRetry}>
        Refresh
      </Button>
    </div>
  );
}
