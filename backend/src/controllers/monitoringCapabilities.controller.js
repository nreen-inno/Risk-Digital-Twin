import {
  monitoringCapabilities,
  findMonitoringCapabilityById
} from "../data/monitoringCapabilities.js";

import { container } from "../config/cosmos.js";


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

    const grouped = {
      active: [],
      draft: [],
      disabled: []
    };

    for (const source of resources) {
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

