// =============================================================================
// AI Source Advisor — presentation helpers (colors, labels) + light
// normalization primitives shared with the API layer. Pure, no side effects.
// =============================================================================

/** Normalize any coverage/availability term to strong|partial|missing|unknown. */
export function normalizeStatus(value) {
  const s = String(value || "").toLowerCase();
  if (s.includes("strong") || s.includes("available") || s.includes("good") || s.includes("full"))
    return "strong";
  if (s.includes("partial") || s.includes("limited") || s.includes("some"))
    return "partial";
  if (s.includes("missing") || s.includes("unavailable") || s.includes("none") || s.includes("gap"))
    return "missing";
  return "unknown";
}

/** Lower rank = higher priority (sorts first). */
export function priorityRank(priority) {
  if (typeof priority === "number") return priority;
  const s = String(priority || "").toLowerCase();
  if (s.includes("critical") || s.includes("high")) return 0;
  if (s.includes("medium") || s.includes("moderate")) return 1;
  if (s.includes("low")) return 2;
  return 3;
}

export const STATUS_META = {
  strong: { label: "Strong", color: "var(--ok)", bg: "rgba(31,157,107,.10)", bd: "rgba(31,157,107,.24)" },
  partial: { label: "Partial", color: "var(--warn)", bg: "rgba(201,138,23,.12)", bd: "rgba(201,138,23,.26)" },
  missing: { label: "Missing", color: "var(--danger)", bg: "rgba(214,69,69,.10)", bd: "rgba(214,69,69,.24)" },
  unknown: { label: "Unknown", color: "var(--ink-3)", bg: "rgba(138,147,168,.12)", bd: "rgba(138,147,168,.28)" },
};

export function statusMeta(status) {
  return STATUS_META[normalizeStatus(status)] || STATUS_META.unknown;
}

export const PRIORITY_META = {
  high: { label: "High priority", color: "var(--danger)", bg: "rgba(214,69,69,.10)", bd: "rgba(214,69,69,.24)" },
  medium: { label: "Medium priority", color: "var(--warn)", bg: "rgba(201,138,23,.12)", bd: "rgba(201,138,23,.26)" },
  low: { label: "Low priority", color: "var(--accent)", bg: "rgba(47,107,255,.10)", bd: "rgba(47,107,255,.24)" },
};

export function priorityMeta(priority) {
  const rank = priorityRank(priority);
  if (rank <= 0) return PRIORITY_META.high;
  if (rank === 1) return PRIORITY_META.medium;
  if (rank === 2) return PRIORITY_META.low;
  const label = String(priority || "Priority");
  return { label: label.charAt(0).toUpperCase() + label.slice(1), color: "var(--ink-3)", bg: "rgba(138,147,168,.12)", bd: "rgba(138,147,168,.28)" };
}
