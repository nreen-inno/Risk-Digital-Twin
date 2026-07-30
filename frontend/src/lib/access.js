// =============================================================================
// Access-information & connector presentation helpers.
// =============================================================================

/** Map a raw availabilityStatus to a broad access kind. */
export function accessKind(availabilityStatus) {
  const s = String(availabilityStatus || "").toLowerCase();
  if (s.includes("subscription")) return "subscription";
  if (s.includes("registration")) return "registration";
  if (s.includes("customer")) return "customer";
  if (s.includes("upload") || s.includes("file")) return "upload";
  if (s.includes("available") || s.includes("public") || s.includes("free") || s.includes("open"))
    return "available";
  return "unknown";
}

export const ANSWER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "unknown", label: "No / Not sure" },
];

/**
 * Build the existing backend business-access contract while storing the new
 * flexible access description in notes. No secrets should be entered here.
 */
export function buildBusinessAccessPayload(answer, accessInformation = "") {
  const a = answer === "yes" ? "yes" : "unknown";
  return {
    accessKnown: a,
    organisationHasSubscription: "notRequired",
    internalOwner: "",
    contactDepartment: "",
    providerPortal: "",
    notes: accessInformation.trim(),
    decisionStatus: a === "yes" ? "accessAvailable" : "pending",
  };
}

/** Recover the technical-access answer from stored Business Access. */
export function primaryAnswerFromBusinessAccess(ba = {}) {
  return ba.accessKnown === "yes" || ba.decisionStatus === "accessAvailable"
    ? "yes"
    : ba.accessKnown
      ? "unknown"
      : "";
}

// ---- Readiness / complexity badge meta ----

const BADGE = {
  ok: { color: "var(--ok)", bg: "rgba(31,157,107,.10)", bd: "rgba(31,157,107,.24)" },
  warn: { color: "var(--warn)", bg: "rgba(201,138,23,.12)", bd: "rgba(201,138,23,.26)" },
  danger: { color: "var(--danger)", bg: "rgba(214,69,69,.10)", bd: "rgba(214,69,69,.24)" },
  muted: { color: "var(--ink-3)", bg: "rgba(138,147,168,.12)", bd: "rgba(138,147,168,.28)" },
};

export function readinessMeta(readiness) {
  const s = String(readiness || "").toLowerCase();
  if (s.includes("partial")) return { label: "Partially ready", ...BADGE.warn };
  if (s.includes("ready")) return { label: "Ready", ...BADGE.ok };
  if (s.includes("action")) return { label: "Action required", ...BADGE.danger };
  return { label: "Unknown", ...BADGE.muted };
}

export function complexityMeta(complexity) {
  const s = String(complexity || "").toLowerCase();
  if (s === "low") return { label: "Low", ...BADGE.ok };
  if (s === "medium") return { label: "Medium", ...BADGE.warn };
  if (s === "high") return { label: "High", ...BADGE.danger };
  return { label: "Unknown", ...BADGE.muted };
}

export function confidenceLevel(conf) {
  if (typeof conf !== "number") return { label: "Not provided", pct: 0, tone: "var(--ink-3)" };
  const pct = Math.round(conf > 1 ? conf : conf * 100);
  if (pct >= 75) return { label: "High confidence", pct, tone: "var(--ok)" };
  if (pct >= 50) return { label: "Medium confidence", pct, tone: "var(--warn)" };
  return { label: "Lower confidence", pct, tone: "var(--danger)" };
}
