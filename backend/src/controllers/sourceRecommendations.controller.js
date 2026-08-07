import { findMonitoringCapabilityById } from "../data/monitoringCapabilities.js";
import { generateSourceRecommendations } from "../ai/services/aiSourceAdvisor.service.js";
import { container } from "../config/cosmos.js";

async function listSourcesForObjective(monitoringObjectiveId) {
  const { resources } = await container.items
    .query({
      query: `
        SELECT *
        FROM c
        WHERE c.objectType = @objectType
          AND ARRAY_CONTAINS(c.monitoringObjectiveIds, @moId)
        ORDER BY c.name
      `,
      parameters: [
        { name: "@objectType", value: "informationSource" },
        { name: "@moId", value: monitoringObjectiveId }
      ]
    })
    .fetchAll();
  return resources || [];
}

export async function getSourceRecommendations(req, res, next) {
  try {
    const objective = findMonitoringCapabilityById(req.params.id);

    if (!objective) {
      return res.status(404).json({
        error: "Monitoring objective not found"
      });
    }

    const {
      industry = "cruise shipbuilding",
      geographies = ["Finland", "European Union"],
      customerContext =
        "Large European shipyard with global suppliers",
      selectedSourceIds = []
    } = req.body || {};

    const existingSources = await listSourcesForObjective(objective.id);

    const recommendations = await generateSourceRecommendations({
      objective,
      industry,
      geographies,
      customerContext,
      selectedSourceIds,
      existingSources
    });

    res.status(200).json({
      monitoringObjectiveId: objective.id,
      generatedBy: "azureOpenAI",
      generatedAt: new Date().toISOString(),
      groundedInDatabase: true,
      existingSourceCount: existingSources.length,
      ...recommendations
    });
  } catch (error) {
    next(error);
  }
}
