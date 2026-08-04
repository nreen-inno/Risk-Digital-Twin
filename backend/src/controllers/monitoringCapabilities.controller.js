import {
  monitoringCapabilities,
  findMonitoringCapabilityById
} from "../data/monitoringCapabilities.js";

import { container } from "../config/cosmos.js";
import {
  formatPollInterval
} from "../connectors/connectorLifecycle.service.js";


export function getMonitoringCapabilities(req, res) {
  res.status(200).json({
    count: monitoringCapabilities.length,
    items: monitoringCapabilities
  });
}

export function getMonitoringCapabilityById(req, res) {
  const capability = findMonitoringCapabilityById(
    req.params.id
  );

  if (!capability) {
    return res.status(404).json({
      error: "Monitoring objective not found"
    });
  }

  res.status(200).json(capability);
}
export async function getMonitoringCapabilityInformationSources(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;

    const querySpec = {
      query: `
        SELECT *
        FROM c
        WHERE c.objectType = @objectType
          AND ARRAY_CONTAINS(
            c.monitoringObjectiveIds,
            @monitoringObjectiveId
          )
        ORDER BY c.name
      `,
      parameters: [
        {
          name: "@objectType",
          value: "informationSource"
        },
        {
          name: "@monitoringObjectiveId",
          value: id
        }
      ]
    };

    const { resources } =
      await container.items
        .query(querySpec)
        .fetchAll();

    // Enrich sources with schedule from latest connector definition when missing.
    const sourceIds = resources.map((s) => s.id).filter(Boolean);
    const definitionsBySource = new Map();

    if (sourceIds.length) {
      const defQuery = {
        query: `
          SELECT *
          FROM c
          WHERE c.objectType = @objectType
            AND ARRAY_CONTAINS(@sourceIds, c.informationSourceId)
        `,
        parameters: [
          { name: "@objectType", value: "connectorDefinition" },
          { name: "@sourceIds", value: sourceIds }
        ]
      };
      const { resources: definitions } = await container.items
        .query(defQuery)
        .fetchAll();

      for (const def of definitions) {
        const sid = def.informationSourceId;
        const prev = definitionsBySource.get(sid);
        if (!prev || String(def.createdAt || "") > String(prev.createdAt || "")) {
          definitionsBySource.set(sid, def);
        }
      }
    }

    const grouped = {
      active: [],
      draft: [],
      disabled: []
    };

    for (const source of resources) {
      const def = definitionsBySource.get(source.id);
      if (def) {
        const pollInterval =
          def.config?.pollInterval ||
          source.pollInterval ||
          (source.status === "active" || source.connectorStatus === "active"
            ? "PT6H"
            : "");
        const label =
          source.collectionFrequency ||
          source.refreshFrequency ||
          formatPollInterval(pollInterval);
        if (pollInterval && !source.pollInterval) source.pollInterval = pollInterval;
        if (label) {
          source.collectionFrequency = label;
          source.refreshFrequency = label;
        }
        if (!source.connectionMethod) {
          source.connectionMethod = def.connectionMethod || def.adapterType || "";
        }
        if (
          (!source.connectorStatus || source.connectorStatus === "notConfigured") &&
          def.status
        ) {
          source.connectorStatus =
            source.status === "active" ? "active" : source.connectorStatus || def.status;
        }
      }

      const status = [
        "active",
        "draft",
        "disabled"
      ].includes(source.status)
        ? source.status
        : "draft";

      grouped[status].push(source);
    }

    res.status(200).json({
      monitoringObjectiveId: id,

      sources: grouped,

      counts: {
        active: grouped.active.length,
        draft: grouped.draft.length,
        disabled: grouped.disabled.length
      }
    });
  } catch (error) {
    next(error);
  }
}

