import AiThinking from "./AiThinking.jsx";

const CONNECTOR_STEPS = [
  "Reviewing your business-access answers",
  "Assessing suitable connection options",
  "Estimating effort and expected data",
  "Preparing connector advice",
];

/**
 * AI loading state for longer AI-backed requests (e.g. connector advice, up to
 * ~90s). A thin wrapper over the shared AiThinking mark so we don't fork the
 * design system. Inline by default.
 */
export default function AiLoadingState({
  title = "AI Connector Advisor is analysing",
  steps = CONNECTOR_STEPS,
  fullscreen = false,
}) {
  return <AiThinking title={title} steps={steps} fullscreen={fullscreen} />;
}
