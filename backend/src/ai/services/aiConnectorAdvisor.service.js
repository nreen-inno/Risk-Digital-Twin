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

function buildConnectorAdvisorInput(source) {
  if (!source) {
    throw new Error(
      "Information source is required for connector advice."
    );
  }

  return {
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
    }
  };
}

export async function generateConnectorAdvice(
  source
) {
  const input =
    buildConnectorAdvisorInput(source);

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
          name: "connector_advisor",
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

  try {
    return JSON.parse(
      response.output_text
    );
  } catch (error) {
    throw new Error(
      `AI Connector Advisor returned invalid JSON: ${error.message}`
    );
  }
}
