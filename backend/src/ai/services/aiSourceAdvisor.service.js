import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  aiClient,
  AZURE_OPENAI_DEPLOYMENT
} from "../../config/ai.js";

import {
  sourceAdvisorSchema
} from "../schemas/sourceAdvisor.schema.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

function loadSourceAdvisorPrompt() {
  const promptPath = path.resolve(
    currentDirectory,
    "../prompts/sourceAdvisor.md"
  );

  try {
    return fs.readFileSync(promptPath, "utf8").trim();
  } catch (error) {
    throw new Error(
      `Failed to load Source Advisor prompt from "${promptPath}": ${error.message}`
    );
  }
}

const SOURCE_ADVISOR_SYSTEM_PROMPT =
  loadSourceAdvisorPrompt();

function buildAdvisorInput({
  objective,
  industry,
  geographies,
  customerContext,
  selectedSourceIds
}) {
  if (!objective) {
    throw new Error(
      "Monitoring objective is required for source recommendations."
    );
  }

  return {
    monitoringObjective: {
      id: objective.id,
      name: objective.name,
      businessQuestion:
        objective.businessQuestion || "",
      description:
        objective.description || "",
      relatedRiskFactors:
        objective.relatedRiskFactors || [],
      relatedRiskDefinitions:
        objective.relatedRiskDefinitions || []
    },

    currentlySuggestedSources:
      objective.suggestedSources || [],

    customerContext: {
      industry:
        industry || "cruise shipbuilding",

      geographies:
        Array.isArray(geographies) &&
        geographies.length > 0
          ? geographies
          : [
              "Finland",
              "European Union"
            ],

      description:
        customerContext ||
        "Large European shipyard with global suppliers"
    },

    selectedSourceIds:
      Array.isArray(selectedSourceIds)
        ? selectedSourceIds
        : []
  };
}

function sortRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return [...recommendations].sort(
    (first, second) =>
      first.priority - second.priority
  );
}

export async function generateSourceRecommendations({
  objective,
  industry,
  geographies,
  customerContext,
  selectedSourceIds
}) {
  const input = buildAdvisorInput({
    objective,
    industry,
    geographies,
    customerContext,
    selectedSourceIds
  });

  const response = await aiClient.responses.create({
    model: AZURE_OPENAI_DEPLOYMENT,

    instructions:
      SOURCE_ADVISOR_SYSTEM_PROMPT,

    input: JSON.stringify(
      input,
      null,
      2
    ),

    text: {
      format: {
        type: "json_schema",
        name: "source_advisor_recommendations",
        strict: true,
        schema: sourceAdvisorSchema
      }
    }
  });

  if (!response.output_text) {
    throw new Error(
      "AI Source Advisor returned no structured output."
    );
  }

  let result;

  try {
    result = JSON.parse(response.output_text);
  } catch (error) {
    throw new Error(
      `AI Source Advisor returned invalid JSON: ${error.message}`
    );
  }

  return {
    ...result,
    recommendations: sortRecommendations(
      result.recommendations
    )
  };
}
