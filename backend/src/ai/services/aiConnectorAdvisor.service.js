import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  aiClient,
  AZURE_OPENAI_DEPLOYMENT
} from "../../config/ai.js";

import {
  connectorAdvisorSchema
} from "../schemas/connectorAdvisor.schema.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const PLATFORM_DEFAULTS = {
  defaultPollInterval: "PT6H",
  defaultLanguages: ["fi", "en"],
  defaultSensitivity: "balanced",
  rawRecordRetentionDays: 90
};

function loadConnectorAdvisorPrompt() {
  const promptPath = path.resolve(
    currentDirectory,
    "../prompts/connectorAdvisor.md"
  );

  try {
    return fs.readFileSync(promptPath, "utf8").trim();
  } catch (error) {
    throw new Error(
      `Failed to load Connector Advisor prompt from "${promptPath}": ${error.message}`
    );
  }
}

const CONNECTOR_ADVISOR_PROMPT =
  loadConnectorAdvisorPrompt();

function buildMonitoringObjectiveContext(objective) {
  if (!objective) {
    return null;
  }

  return {
    id: objective.id,
    name: objective.name,
    description: objective.description || "",
    businessQuestion: objective.businessQuestion || "",
    linkedRiskCategories:
      objective.relatedRiskDefinitions || [],
    relatedRiskFactors:
      objective.relatedRiskFactors || []
  };
}

function buildConnectorAdvisorInput(
  source,
  { monitoringObjective = null } = {}
) {
  if (!source) {
    throw new Error(
      "Information source is required for connector advice."
    );
  }

  const objectiveContext =
    buildMonitoringObjectiveContext(monitoringObjective);

  return {
    monitoringObjective: objectiveContext,

    informationSource: {
      id: source.id,
      name: source.name,
      description: source.description || "",
      provider: source.provider || "",
      sourceKind: source.sourceKind || "toBeConfirmed",
      sourceRole: source.sourceRole || "external",

      monitoringObjectiveIds:
        source.monitoringObjectiveIds || [],

      informationNeed:
        source.informationNeed || "",

      businessValue:
        source.businessValue || "",

      availabilityStatus:
        source.availabilityStatus || "unknown",

      availabilityLabel:
        source.availabilityLabel || "",

      documentation:
        source.documentation || "",

      documentationUrl:
        source.documentationUrl || "",

      sampleDataAvailable:
        source.sampleData !== null &&
        source.sampleData !== undefined,

      supportedRiskFactorIds:
        source.supportedRiskFactorIds || [],

      relatedRiskDefinitionIds:
        source.relatedRiskDefinitionIds || [],

      businessAccess: {
        accessKnown:
          source.businessAccess?.accessKnown ||
          "unknown",

        organisationHasSubscription:
          source.businessAccess
            ?.organisationHasSubscription ||
          "unknown",

        internalOwner:
          source.businessAccess?.internalOwner ||
          "",

        contactDepartment:
          source.businessAccess
            ?.contactDepartment ||
          "",

        providerPortal:
          source.businessAccess?.providerPortal ||
          "",

        decisionStatus:
          source.businessAccess?.decisionStatus ||
          "pending",

        notes:
          source.businessAccess?.notes || ""
      },

      connectorStatus:
        source.connectorStatus ||
        "notConfigured"
    },

    existingRiskTaxonomy: objectiveContext
      ? [
          ...(objectiveContext.linkedRiskCategories || []),
          ...(objectiveContext.relatedRiskFactors || [])
        ]
      : [
          ...(source.relatedRiskDefinitionIds || []),
          ...(source.supportedRiskFactorIds || [])
        ],

    platformDefaults: PLATFORM_DEFAULTS
  };
}

function fieldMappingsToObject(fieldMappings) {
  if (!Array.isArray(fieldMappings)) {
    return {};
  }

  const mapping = {};

  for (const item of fieldMappings) {
    if (!item || typeof item !== "object") continue;
    const sourceField = String(item.sourceField || "").trim();
    const canonicalField = String(item.canonicalField || "").trim();
    if (!sourceField || !canonicalField) continue;
    mapping[sourceField] = canonicalField;
  }

  return mapping;
}

function readinessToLegacy(connectorReadiness) {
  switch (connectorReadiness) {
    case "ready-for-activation":
    case "ready-for-test":
      return "ready";
    case "proposal-ready":
      return "partiallyReady";
    case "test-failed":
      return "actionRequired";
    default:
      return "unknown";
  }
}

/**
 * Normalize AI output for the frontend: convert fieldMappings →
 * proposedFieldMapping object, and keep a few legacy aliases so older
 * panels still degrade cleanly.
 */
export function normalizeConnectorAdviceOutput(advice) {
  if (!advice || typeof advice !== "object") {
    return advice;
  }

  const technicalConfiguration = {
    ...(advice.technicalConfiguration || {}),
    proposedFieldMapping: fieldMappingsToObject(
      advice.technicalConfiguration?.fieldMappings
    )
  };

  // Prefer object form for clients; keep fieldMappings for debugging.
  delete technicalConfiguration.fieldMappings;

  const connectorReadiness =
    advice.connectorReadiness || "proposal-ready";

  const canGenerate =
    connectorReadiness === "ready-for-test" ||
    connectorReadiness === "ready-for-activation";

  return {
    ...advice,
    technicalConfiguration,

    // Legacy aliases (Sprint 3 panels / older normalizer paths)
    readiness: readinessToLegacy(connectorReadiness),
    recommendedApproach: {
      connectionMethod:
        advice.recommendation?.connectionMethod || "",
      refreshFrequency:
        technicalConfiguration.pollInterval ||
        PLATFORM_DEFAULTS.defaultPollInterval,
      expectedData: Object.values(
        technicalConfiguration.proposedFieldMapping || {}
      ),
      rationale: advice.recommendation?.rationale || "",
      authenticationType:
        technicalConfiguration.authenticationType || "",
      languages:
        advice.monitoringConfiguration?.languages || []
    },
    missingInformation:
      advice.unresolvedTechnicalFacts || [],
    requiredBeforeConnection:
      advice.decisionsRequiringUserApproval || [],
    estimatedComplexity: canGenerate ? "medium" : "unknown",
    canGenerateConnectorDefinition: canGenerate
  };
}

export async function generateConnectorAdvice(
  source,
  options = {}
) {
  const input = buildConnectorAdvisorInput(source, options);

  const response =
    await aiClient.responses.create({
      model: AZURE_OPENAI_DEPLOYMENT,

      instructions:
        CONNECTOR_ADVISOR_PROMPT,

      input: JSON.stringify(
        input,
        null,
        2
      ),

      text: {
        format: {
          type: "json_schema",
          name: "connector_proposal_v2",
          strict: true,
          schema: connectorAdvisorSchema
        }
      }
    });

  if (!response.output_text) {
    throw new Error(
      "AI Connector Advisor returned no structured output."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(response.output_text);
  } catch (error) {
    throw new Error(
      `AI Connector Advisor returned invalid JSON: ${error.message}`
    );
  }

  return normalizeConnectorAdviceOutput(parsed);
}

export { PLATFORM_DEFAULTS, buildConnectorAdvisorInput };
