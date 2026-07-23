// =============================================================================
// Information-source presentation helpers.
// The backend stores a minimal source record (name, sourceKind, sourceRole,
// requiresSimulation). Everything a rich card needs to show — descriptions,
// suggested use, supported inputs, access type, demo-data mode — is derived
// here so the backend contract stays untouched. Pure presentation logic.
// =============================================================================

/** Turn an id like "supplier-financial-pressure" into "Supplier financial pressure". */
export function humanizeId(id) {
  if (!id) return "";
  const words = String(id).split(/[-_\s]+/).filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const KIND_META = {
  restApi: { label: "REST API", inputs: "JSON", access: "API endpoint" },
  rss: { label: "RSS Feed", inputs: "RSS / XML", access: "Public feed" },
  csv: { label: "CSV Export", inputs: "CSV", access: "File import" },
  excel: { label: "Excel Export", inputs: "XLSX", access: "File import" },
  database: { label: "Database", inputs: "SQL records", access: "Database connection" },
  manual: { label: "Manual Entry", inputs: "Structured form", access: "Manual" },
};

const ROLE_META = {
  internal: { label: "Internal", use: "Operational data from internal systems" },
  external: { label: "External", use: "Continuous monitoring of external signals" },
  historical: { label: "Historical", use: "Baseline and trend analysis" },
};

/** Normalize a raw sourceRole string to one of internal|external|historical. */
export function normalizeRole(role) {
  const r = String(role || "").toLowerCase();
  if (r.includes("intern")) return "internal";
  if (r.includes("hist") || r.includes("archive")) return "historical";
  return "external";
}

/**
 * Enrich a minimal source record into the full view-model a card renders.
 * Input:  { id, name, sourceKind, role, requiresSimulation }
 * Output: adds kindLabel, roleLabel, description, suggestedUse,
 *         supportedInputs, accessType, demoDataMode.
 */
export function deriveSourceView(source) {
  const role = normalizeRole(source.role);
  const kindMeta = KIND_META[source.sourceKind] || {
    label: humanizeId(source.sourceKind) || "Data source",
    inputs: "—",
    access: "—",
  };
  const roleMeta = ROLE_META[role];

  let accessType = kindMeta.access;
  if (source.sourceKind === "restApi") {
    accessType = role === "internal" ? "Internal system (credentials)" : "Public API";
  }

  const description =
    role === "internal"
      ? `Internal ${kindMeta.label.toLowerCase()} integrating operational data from your own systems.`
      : role === "historical"
      ? `Historical ${kindMeta.label.toLowerCase()} providing past records for baselines and trend detection.`
      : `External ${kindMeta.label.toLowerCase()} delivering live external signals for this objective.`;

  return {
    id: source.id,
    name: source.name,
    sourceKind: source.sourceKind,
    role,
    requiresSimulation: !!source.requiresSimulation,
    kindLabel: kindMeta.label,
    roleLabel: roleMeta.label,
    supportedInputs: kindMeta.inputs,
    accessType,
    suggestedUse: roleMeta.use,
    description,
    demoDataMode: source.requiresSimulation ? "Demo / simulated data" : "Live data",
  };
}
