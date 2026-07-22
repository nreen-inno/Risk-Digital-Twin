import { findMonitoringCapabilityById } from "../data/monitoringCapabilities.js";
import { generateSourceRecommendations } from "../ai/services/aiSourceAdvisor.service.js";

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

    const recommendations =
      await generateSourceRecommendations({
        objective,
        industry,
        geographies,
        customerContext,
        selectedSourceIds
      });

    res.status(200).json({
      monitoringObjectiveId: objective.id,
      generatedBy: "azureOpenAI",
      generatedAt: new Date().toISOString(),
      ...recommendations
    });
  } catch (error) {
    next(error);
  }
}
