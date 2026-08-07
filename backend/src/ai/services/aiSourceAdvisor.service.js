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

const SOURCE_ADVISOR_SYSTEM_PROMPT = loadSourceAdvisorPrompt();

function isInUse(source) {
  return (
    source?.status === "active" ||
    source?.connectorStatus === "active"
  );
}

function summarizeSource(source) {
  return {
    id: source.id,
    name: source.name || "",
    provider: source.provider || "",
    status: source.status || "draft",
    connectorStatus: source.connectorStatus || "notConfigured",
    inUse: isInUse(source),
    sourceKind: source.sourceKind || "",
    connectionMethod:
      source.connectionMethod ||
      source.connectorDefinition?.connectionMethod ||
      source.connectorDefinition?.adapterType ||
      "",
    informationNeed: source.informationNeed || source.monitoringFocus || "",
    lifecycle:
      source.status === "active"
        ? "inUse"
        : source.status === "disabled"
          ? "disabled"
          : "onboarding"
  };
}

function buildAdvisorInput({
  objective,
  industry,
  geographies,
  customerContext,
  selectedSourceIds,
  existingSources = []
}) {
  if (!objective) {
    throw new Error(
      "Monitoring objective is required for source recommendations."
    );
  }

  const inventory = (existingSources || []).map(summarizeSource);
  const inUseCount = inventory.filter((s) => s.inUse).length;

  return {
    monitoringObjective: {
      id: objective.id,
      name: objective.name,
      businessQuestion: objective.businessQuestion || "",
      description: objective.description || "",
      relatedRiskFactors: objective.relatedRiskFactors || [],
      relatedRiskDefinitions: objective.relatedRiskDefinitions || []
    },

    // Catalogue hints only — NOT installed sources.
    currentlySuggestedSources: objective.suggestedSources || [],

    // Real DB inventory for this objective (authoritative for coverage).
    existingInformationSources: inventory,
    existingSourceInventorySummary: {
      total: inventory.length,
      inUse: inUseCount,
      onboarding: inventory.filter((s) => s.lifecycle === "onboarding").length,
      disabled: inventory.filter((s) => s.lifecycle === "disabled").length,
      note:
        inventory.length === 0
          ? "No information sources are linked to this objective yet. Coverage should be mostly missing."
          : `Coverage must reflect these ${inventory.length} on-platform source(s) only.`
    },

    customerContext: {
      industry: industry || "cruise shipbuilding",
      geographies:
        Array.isArray(geographies) && geographies.length > 0
          ? geographies
          : ["Finland", "European Union"],
      description:
        customerContext ||
        "Large European shipyard with global suppliers"
    },

    selectedSourceIds: Array.isArray(selectedSourceIds)
      ? selectedSourceIds
      : []
  };
}

function sortRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }
  return [...recommendations].sort(
    (first, second) => first.priority - second.priority
  );
}

/**
 * Ensure coverage items only reference real source ids and do not claim
 * strong/partial coverage without a linked on-platform source.
 */
export function groundCoverageAssessment(assessment, existingSources = []) {
  const byId = new Map(
    (existingSources || []).filter((s) => s?.id).map((s) => [s.id, s])
  );
  const items = Array.isArray(assessment) ? assessment : [];

  return items.map((item) => {
    const need = item.informationNeed || item.name || "Information need";
    const explanation = String(item.explanation || item.detail || "").trim();
    let ids = Array.isArray(item.existingSourceIds)
      ? item.existingSourceIds.filter((id) => byId.has(id))
      : [];

    // If AI omitted ids, try attach by obvious name mention in explanation.
    if (!ids.length && byId.size) {
      for (const [id, source] of byId) {
        const name = String(source.name || "").toLowerCase();
        const provider = String(source.provider || "").toLowerCase();
        const blob = `${explanation} ${need}`.toLowerCase();
        if (
          (name && name.length > 2 && blob.includes(name)) ||
          (provider && provider.length > 2 && blob.includes(provider))
        ) {
          ids.push(id);
        }
      }
      ids = [...new Set(ids)];
    }

    let coverage = String(item.coverage || item.status || "missing").toLowerCase();
    if (!["strong", "partial", "missing", "unknown"].includes(coverage)) {
      coverage = "missing";
    }

    if (byId.size === 0) {
      return {
        informationNeed: need,
        coverage: "missing",
        existingSourceIds: [],
        explanation:
          explanation ||
          "No on-platform sources are linked to this objective yet."
      };
    }

    if ((coverage === "strong" || coverage === "partial") && ids.length === 0) {
      return {
        informationNeed: need,
        coverage: "missing",
        existingSourceIds: [],
        explanation:
          explanation ||
          "No linked on-platform source was confirmed for this need."
      };
    }

    const linked = ids.map((id) => byId.get(id)).filter(Boolean);
    const anyInUse = linked.some(isInUse);

    if (coverage === "strong" && ids.length && !anyInUse) {
      coverage = "partial";
    }

    return {
      informationNeed: need,
      coverage,
      existingSourceIds: ids,
      explanation:
        explanation ||
        (coverage === "missing"
          ? "Not covered by current on-platform sources."
          : "Covered by linked on-platform sources.")
    };
  });
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesOverlap(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  // Shared distinctive tokens (opensanctions, yle, fmi, …)
  const tokens = (s) =>
    s.split(" ").filter((t) => t.length > 3 && !["financial", "sanctions", "source", "news"].includes(t));
  const lt = new Set(tokens(left));
  const rt = tokens(right);
  return rt.some((t) => lt.has(t));
}

/**
 * Mark recommendations that already exist on-platform so the UI can offer
 * Continue onboarding / Open instead of Accept.
 */
export function annotateExistingRecommendations(recommendations, existingSources = []) {
  const sources = existingSources || [];
  return (recommendations || []).map((rec) => {
    const recName = rec.name || rec.sourceName || "";
    const recProvider = rec.provider || "";
    const match = sources.find((s) => {
      if (rec.id && s.sourceRecommendationId && rec.id === s.sourceRecommendationId) {
        return true;
      }
      return (
        namesOverlap(recName, s.name) ||
        namesOverlap(recProvider, s.name) ||
        namesOverlap(recName, s.provider) ||
        namesOverlap(recProvider, s.provider)
      );
    });

    if (!match) {
      return {
        ...rec,
        alreadyOnPlatform: false,
        existingSourceId: null,
        existingLifecycle: null
      };
    }

    const inUse = isInUse(match);
    return {
      ...rec,
      alreadyOnPlatform: true,
      existingSourceId: match.id,
      existingLifecycle: inUse
        ? "inUse"
        : match.status === "disabled"
          ? "disabled"
          : "onboarding",
      existingSourceName: match.name || "",
      existingConnectorStatus: match.connectorStatus || ""
    };
  });
}

export async function generateSourceRecommendations({
  objective,
  industry,
  geographies,
  customerContext,
  selectedSourceIds,
  existingSources = []
}) {
  const input = buildAdvisorInput({
    objective,
    industry,
    geographies,
    customerContext,
    selectedSourceIds,
    existingSources
  });

  const response = await aiClient.responses.create({
    model: AZURE_OPENAI_DEPLOYMENT,
    instructions: SOURCE_ADVISOR_SYSTEM_PROMPT,
    input: JSON.stringify(input, null, 2),
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
    throw new Error("AI Source Advisor returned no structured output.");
  }

  let result;
  try {
    result = JSON.parse(response.output_text);
  } catch (error) {
    throw new Error(
      `AI Source Advisor returned invalid JSON: ${error.message}`
    );
  }

  const groundedCoverage = groundCoverageAssessment(
    result.coverageAssessment,
    existingSources
  );

  const recommendations = annotateExistingRecommendations(
    sortRecommendations(result.recommendations),
    existingSources
  );

  return {
    ...result,
    coverageAssessment: groundedCoverage,
    existingInformationSources: (existingSources || []).map(summarizeSource),
    recommendations
  };
}
