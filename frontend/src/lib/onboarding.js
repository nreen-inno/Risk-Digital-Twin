// =============================================================================
// AI Source Onboarding — connector-recommendation instruction builders.
//
// The instruction is stashed into the source's business-access notes, then
// POST /connector-advice runs the AI. These builders encode the architecture
// boundaries and responsibility separation so the AI produces a decisive
// Connector Proposal — not a cautious consultancy checklist.
//
// Key ideas (from the reference architectures + onboarding discussion):
//  - Onboarding produces a Connector Proposal / Specification. Runtime objects
//    (RawRecord, AIEnrichment, RiskSignal) are created LATER by the platform.
//  - The connector only collects + maps canonical fields; business-risk
//    interpretation happens downstream (pre-filter → enrichment → risk signals).
//  - Every uncertainty is classified into exactly three groups:
//      automatedValidationPlan   → the connector TEST will verify these
//      decisionsRequiringUserApproval → business choices for the risk manager
//      unresolvedTechnicalFacts  → public facts AI genuinely could not find
//  - Never ask the risk manager for publicly discoverable technical facts, and
//    never present connector-test tasks as questions.
// =============================================================================

export const PLATFORM_DEFAULTS = {
  defaultPollInterval: "PT6H",
  defaultLanguages: ["fi", "en"],
  defaultSensitivity: "balanced",
  rawRecordRetentionDays: 90,
};

const ARCHITECTURE = `Platform context you must respect:

Onboarding lifecycle (you are producing the Connector Proposal):
Monitoring Objective -> Information Source -> Connector Proposal -> Connector Specification -> Connector Definition -> Automated Connector Test -> Active Connector.

Runtime pipeline (created LATER by the platform, not by this connector):
Connector -> RawRecord -> Pre-filter using Monitoring Profile -> AI Enrichment -> Risk Signal -> Dashboard.

The connector's responsibility is COLLECTION and canonical field mapping only. Do NOT place business-risk interpretation inside source-specific connector logic — downstream pre-filter, enrichment and risk-signal services provide relevance filtering and risk interpretation. A source connector (e.g. a news feed) does not need to solve every monitoring question itself; it collects canonical records.`;

const RESPONSIBILITIES = `Resolve publicly available technical facts YOURSELF, including: official provider identity; official documentation; supported connection methods; endpoints; authentication; formats; known query parameters; public terms or limitations. Do NOT ask the risk manager to locate documentation, endpoints, identifiers, field names, API details or other publicly discoverable technical facts. Propose sensible defaults rather than open-ended questions.

Classify every remaining uncertainty into EXACTLY three groups:
1. automatedValidationPlan — facts the automated connector TEST must verify (endpoint availability, actual fields, identifier/GUID stability, deduplication, parsing/encoding, rate limits, pagination, field-mapping confirmation). These are NOT user homework.
2. decisionsRequiringUserApproval — business choices only the risk manager should approve (business scope, languages, geographic coverage, monitoring sensitivity, risk-category mapping, accept/modify). Prefer a short list of real forks; make opinionated defaults for the rest and state them under assumptions.
3. unresolvedTechnicalFacts — public technical facts you could not reliably discover. Use this ONLY after genuine research has failed. "The source probably has RSS" is discoverable and must be resolved, not listed here.

Keep "assumptions" for GENUINE business assumptions that depend on business intent and can be shown to the risk manager (e.g. "Include Finnish-language articles because the objective concerns Finnish shipbuilding"). Never present connector-test tasks as questions for the risk manager. Do not drip-feed new micro-decisions across turns; decide on the first pass wherever a sensible default exists.`;

const READINESS = `Connector readiness states (choose the honest one — do NOT report "not ready" merely because something is unverified):
- proposal-ready: you have enough information to recommend a configuration.
- ready-for-test: a Connector Specification can be created and automatically tested. A proposal may be ready-for-test even before a live fetch has validated every field.
- test-failed: the endpoint or mapping did not work.
- ready-for-activation: the automated test passed.`;

const SCHEMA = `Return ONLY a JSON object with this shape (omit unknown fields rather than inventing values):
{
  "source": { "name": "", "provider": "", "sourceType": "" },
  "recommendation": {
    "connectionMethod": "rss|api|file|database|email|scrape",
    "rationale": "",
    "alternativeMethods": [ { "method": "", "status": "recommended|not-recommended", "reason": "" } ]
  },
  "technicalConfiguration": {
    "endpoint": "", "documentationUrl": "", "authenticationType": "none|apiKey|oauth2|basic",
    "pollInterval": "ISO-8601 duration", "responseFormat": "", "proposedFieldMapping": {}
  },
  "monitoringConfiguration": {
    "languages": [], "geographicScope": [], "sensitivity": "balanced|broad|strict",
    "riskCategoryMappings": [],
    "monitoringProfile": { "includeTerms": [], "excludeTerms": [], "entities": [], "locations": [] }
  },
  "retentionRecommendation": { "storeFeedMetadata": true, "storeRawFeedItem": true, "scrapeFullArticle": false, "reason": "" },
  "automatedValidationPlan": [],
  "decisionsRequiringUserApproval": [],
  "unresolvedTechnicalFacts": [],
  "assumptions": [],
  "confidence": 0.0,
  "connectorReadiness": "proposal-ready|ready-for-test|test-failed|ready-for-activation"
}`;

function contextBlock({ recommendation, objectiveId, objectiveName }) {
  const objective = [
    (objectiveName || recommendation?.objectiveName) && `name: ${objectiveName || recommendation?.objectiveName}`,
    objectiveId && `id: ${objectiveId}`,
  ].filter(Boolean).join(", ");
  const lines = [
    objective && `Monitoring Objective: { ${objective} }`,
    recommendation?.sourceName && `Information Source: { name: ${recommendation.sourceName}${recommendation.provider ? `, provider: ${recommendation.provider}` : ""}${recommendation.recommendationType ? `, type: ${recommendation.recommendationType}` : ""} }`,
    recommendation?.informationNeed && `Information need: ${recommendation.informationNeed}`,
    recommendation?.shortReason && `Why selected: ${recommendation.shortReason}`,
    `Platform defaults: defaultPollInterval=${PLATFORM_DEFAULTS.defaultPollInterval}, defaultLanguages=[${PLATFORM_DEFAULTS.defaultLanguages.join(", ")}], defaultSensitivity=${PLATFORM_DEFAULTS.defaultSensitivity}, rawRecordRetentionDays=${PLATFORM_DEFAULTS.rawRecordRetentionDays}`,
  ].filter(Boolean);
  return lines.length ? `\nContext:\n${lines.join("\n")}` : "";
}

function revisionBlock(revisions = []) {
  if (!revisions.length) return "";
  return `\n\nThe risk manager already reviewed a prior proposal and sent the following decisions / corrections. Treat them as RESOLVED business choices — apply them in the regenerated proposal and do NOT list them again under decisionsRequiringUserApproval.

Rules for this regeneration:
- Fold every item below into technicalConfiguration / monitoringConfiguration / retentionRecommendation / assumptions as appropriate.
- Remove resolved items from decisionsRequiringUserApproval. Only keep business choices that are still open after applying these corrections.
- Do not re-ask for approval of values the user just confirmed or chose.
- Do NOT invent new decisionsRequiringUserApproval on this regeneration unless the user explicitly introduced a new open choice below. Prefer decisive defaults and put remaining technical uncertainty into automatedValidationPlan or assumptions.
- If decisionsRequiringUserApproval can be empty after applying the corrections, return an empty list and prefer connectorReadiness ready-for-test.
- Raise confidence when open business decisions shrink; use ready-for-test when the configuration is concrete enough to auto-test (even if the live test has not run yet).
- Keep unresolvedTechnicalFacts only for public facts you still genuinely cannot confirm.

User decisions / corrections (apply all of them):
${revisions.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
}

function core(extraRole) {
  return [
    "You are the connector architecture assistant for the Risk Digital Twin. Create a practical Connector Proposal for the selected Information Source and Monitoring Objective, in ONE pass, with no interview.",
    ARCHITECTURE,
    extraRole,
    RESPONSIBILITIES,
    "Use the existing Monitoring Objective and risk taxonomy to propose: monitoring scope; geographic scope; languages; a Monitoring Profile; risk-category mappings; and monitoring sensitivity.",
    READINESS,
    SCHEMA,
    "The result must be understandable by a risk manager, not only an integration engineer.",
  ].filter(Boolean).join("\n\n");
}

/** "Let AI analyse the source" — AI researches the source itself. */
export function buildAiInstruction({ recommendation, objectiveId, objectiveName, extraInstructions = "", revisions = [] }) {
  const extra = extraInstructions.trim()
    ? `\n\nAdditional (optional) instructions from the risk manager:\n${extraInstructions.trim()}`
    : "";
  return [
    core("For public sources, infer and propose the best official feed, API or open-data endpoint (prefer official APIs or RSS/Atom over scraping). For enterprise sources, propose the likely connector pattern and clearly label organisation-specific assumptions."),
    contextBlock({ recommendation, objectiveId, objectiveName }),
    extra,
    revisionBlock(revisions),
  ].filter(Boolean).join("\n");
}

/** "I already have technical information" — user supplied technical material. */
export function buildTechnicalInstruction({ recommendation, objectiveId, objectiveName, technicalInfo = "", attachment = null, revisions = [] }) {
  const provided = technicalInfo.trim()
    ? `\n\nTechnical information provided by the user (treat as authoritative where it conflicts with your assumptions; still resolve public gaps yourself):\n${technicalInfo.trim()}`
    : "";
  let file = "";
  if (attachment) {
    file = attachment.text
      ? `\n\nAttached file "${attachment.name}" contents:\n${attachment.text}`
      : `\n\nThe user attached a file "${attachment.name}" (${attachment.type || "binary"}); its contents were not uploaded in this demo — take it as a signal such documentation exists.`;
  }
  return [
    core("The user has supplied technical information (API docs, endpoints, OpenAPI, JSON/XML/CSV/SQL samples, an auth description or notes). Extract and structure it. Never request, store or echo passwords, API keys or access tokens."),
    contextBlock({ recommendation, objectiveId, objectiveName }),
    provided,
    file,
    revisionBlock(revisions),
  ].filter(Boolean).join("\n");
}
