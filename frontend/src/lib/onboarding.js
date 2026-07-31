// =============================================================================
// AI Source Onboarding — instruction builders.
//
// Both onboarding modes ("Let AI analyse the source" and "I already have
// technical information") reuse the SAME existing AI path: the instruction is
// stashed into the source's business-access notes, then POST /connector-advice
// generates the proposal. These helpers build the instruction text. No new
// backend API, no mock AI.
// =============================================================================

const BASE_AI_INSTRUCTION = `You are an AI Integration Architect onboarding an information source into an enterprise Risk Digital Twin.

Produce a complete connector proposal in ONE pass. Do NOT start an interview and do NOT ask the user to research publicly discoverable technical facts.

Use all available context: source identity and website, provider, information need, linked monitoring objective, the Risk Digital Twin purpose, and your own technical and domain knowledge. Make sensible implementation decisions rather than returning homework. For public sources, infer and propose the best official feed, API or open-data endpoint (prefer official APIs or RSS/Atom over scraping). For enterprise sources, propose the likely connector pattern and clearly label organisation-specific assumptions.

Specify: purpose in this Risk Digital Twin; recommended connector type and concrete connection method; authentication type (never request secrets); scope, languages, topics and useful keywords; collection frequency; fields and evidence to retain; deduplication, relevance, urgency, summarisation and mapping to monitoring objectives/risk categories; assumptions and implementation notes; and whether the proposal is ready to accept.

Present what you already know, what you assume, and what information would improve connector quality. Ask no mandatory questions — expose assumptions for optional correction. The result must be understandable by a risk manager, not only an integration engineer.`;

const BASE_TECHNICAL_INSTRUCTION = `You are an AI Integration Architect. The user has provided technical information about an information source (API documentation, endpoints, a Swagger/OpenAPI spec, JSON/XML/CSV/SQL samples, an authentication description or technical notes). Analyse it into a connector specification in ONE pass.

Do NOT start an interview. Extract and structure: what technical information is available and understood; the assumptions you are making to fill gaps; the information that is still missing to finalise the connector; and a clear connector-readiness verdict with a confidence level.

Never ask for, store or echo passwords, API keys or access tokens. Base the proposal on the supplied technical information plus your own knowledge of common systems. The result must be understandable by a risk manager, not only an integration engineer.`;

function sourceContext({ recommendation, objectiveId }) {
  return [
    recommendation?.sourceName && `Source: ${recommendation.sourceName}`,
    recommendation?.provider && `Provider: ${recommendation.provider}`,
    recommendation?.informationNeed && `Information need: ${recommendation.informationNeed}`,
    recommendation?.shortReason && `Why it was selected: ${recommendation.shortReason}`,
    recommendation?.businessValue && `Business value: ${recommendation.businessValue}`,
    objectiveId && `Linked monitoring objective ID: ${objectiveId}`,
  ].filter(Boolean).join("\n");
}

function revisionBlock(revisions = []) {
  if (!revisions.length) return "";
  return `\n\nUser-requested changes to incorporate into a completely regenerated result:\n${revisions
    .map((text, i) => `${i + 1}. ${text}`)
    .join("\n")}`;
}

/** "Let AI analyse the source" — optional free-text instructions from the user. */
export function buildAiInstruction({ recommendation, objectiveId, extraInstructions = "", revisions = [] }) {
  const ctx = sourceContext({ recommendation, objectiveId });
  const extra = extraInstructions.trim()
    ? `\n\nAdditional instructions from the user (optional):\n${extraInstructions.trim()}`
    : "";
  return [
    BASE_AI_INSTRUCTION,
    ctx && `\nKnown source context:\n${ctx}`,
    extra,
    revisionBlock(revisions),
  ].filter(Boolean).join("\n");
}

/** "I already have technical information" — pasted technical info + optional file text. */
export function buildTechnicalInstruction({ recommendation, objectiveId, technicalInfo = "", attachment = null, revisions = [] }) {
  const ctx = sourceContext({ recommendation, objectiveId });
  const provided = technicalInfo.trim()
    ? `\n\nTechnical information provided by the user:\n${technicalInfo.trim()}`
    : "";
  let file = "";
  if (attachment) {
    file = attachment.text
      ? `\n\nAttached file "${attachment.name}" contents:\n${attachment.text}`
      : `\n\nThe user attached a file "${attachment.name}" (${attachment.type || "binary"}); its contents were not uploaded in this demo — take the attachment as a signal that such documentation exists.`;
  }
  return [
    BASE_TECHNICAL_INSTRUCTION,
    ctx && `\nKnown source context:\n${ctx}`,
    provided,
    file,
    revisionBlock(revisions),
  ].filter(Boolean).join("\n");
}
