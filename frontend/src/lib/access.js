// =============================================================================
// Business-access & connector presentation helpers.
// Maps the backend's availability status to the right business question, builds
// the PATCH payload, and provides readiness / complexity / confidence styling.
// Pure, no side effects.
// =============================================================================

/** Map a raw availabilityStatus to a business "access kind". */
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

export const DEPARTMENTS = ["Finance", "Procurement", "Compliance", "IT", "Quality", "Other"];

/** The primary yes/no/unknown question for each access kind (null = no question). */
export function accessQuestion(kind) {
  switch (kind) {
    case "subscription":
      return {
        label: "Does your organisation already have a subscription?",
        helper: "So we know whether a commercial subscription still needs to be arranged.",
      };
    case "registration":
      return {
        label: "Does your organisation already have an authorised account?",
        helper: "Some sources need a registered organisation account before access.",
      };
    case "customer":
      return {
        label: "Has internal access to this source already been confirmed?",
        helper: "This source is reached through an existing customer or internal channel.",
      };
    case "upload":
      return {
        label: "Can you obtain a sample export or file from this source?",
        helper: "This source is provided as an upload — a sample file will be needed later.",
      };
    case "available":
      return null; // no subscription question for public / available-now sources
    default:
      return {
        label: "Do you already have access to this source?",
        helper: "Tell us what you know so we can advise the next practical steps.",
      };
  }
}

export const ANSWER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "I don’t know" },
];

/** Build the backend Business Access payload from kind + answer + optional fields. */
export function buildBusinessAccessPayload(kind, answer, fields = {}) {
  const optional = {
    internalOwner: fields.internalOwner || "",
    contactDepartment: fields.contactDepartment || "",
    providerPortal: fields.providerPortal || "",
    notes: fields.notes || "",
  };
  if (kind === "available") {
    return {
      accessKnown: "yes",
      organisationHasSubscription: "notRequired",
      ...optional,
      decisionStatus: "accessAvailable",
    };
  }
  const a = answer || "unknown";
  const decisionStatus = a === "yes" ? "accessAvailable" : a === "no" ? "actionRequired" : "pending";
  const organisationHasSubscription = kind === "subscription" ? a : "notRequired";
  return { accessKnown: a, organisationHasSubscription, ...optional, decisionStatus };
}

/** Recover the primary answer from stored Business Access (for form prefill). */
export function primaryAnswerFromBusinessAccess(kind, ba = {}) {
  if (kind === "available") return "yes";
  if (kind === "subscription") {
    const sub = ba.organisationHasSubscription;
    if (sub && sub !== "notRequired") return sub;
  }
  return ba.accessKnown || "";
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

/** Confidence as a qualitative level + percentage for a bar (never a raw decimal). */
export function confidenceLevel(conf) {
  if (typeof conf !== "number") return { label: "Not provided", pct: 0, tone: "var(--ink-3)" };
  const pct = Math.round(conf > 1 ? conf : conf * 100);
  if (pct >= 75) return { label: "High confidence", pct, tone: "var(--ok)" };
  if (pct >= 50) return { label: "Medium confidence", pct, tone: "var(--warn)" };
  return { label: "Lower confidence", pct, tone: "var(--danger)" };
}
