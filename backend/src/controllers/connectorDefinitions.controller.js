import { container } from "../config/cosmos.js";

function cleanCosmosFields(item) {
  if (!item) return item;

  const {
    _rid,
    _self,
    _etag,
    _attachments,
    _ts,
    ...cleanItem
  } = item;

  return cleanItem;
}

export async function getConnectorDefinitions(req, res, next) {
  try {
    const querySpec = {
      query: `
        SELECT
          c.id,
          c.objectType,
          c.informationSourceId,
          c.name,
          c.status,
          c.generatedBy,
          c.transport,
          c.inputFormat,
          c.authenticationType,
          c.ingestionStrategy,
          c.semanticMapping,
          c.confidence,
          c.requiresUserReview,
          c.createdAt,
          c.updatedAt
        FROM c
        WHERE c.objectType = @objectType
        ORDER BY c.createdAt DESC
      `,
      parameters: [
        {
          name: "@objectType",
          value: "connectorDefinition"
        }
      ]
    };

    const { resources } = await container.items
      .query(querySpec)
      .fetchAll();

    res.status(200).json({
      count: resources.length,
      items: resources
    });
  } catch (error) {
    next(error);
  }
}

export async function getConnectorDefinitionById(req, res, next) {
  try {
    const { id } = req.params;

    const querySpec = {
      query: `
        SELECT *
        FROM c
        WHERE c.objectType = @objectType
          AND c.id = @id
      `,
      parameters: [
        {
          name: "@objectType",
          value: "connectorDefinition"
        },
        {
          name: "@id",
          value: id
        }
      ]
    };

    const { resources } = await container.items
      .query(querySpec)
      .fetchAll();

    if (resources.length === 0) {
      return res.status(404).json({
        error: "Connector definition not found"
      });
    }

    res.status(200).json(cleanCosmosFields(resources[0]));
  } catch (error) {
    next(error);
  }
}

export async function updateConnectorDefinition(req, res, next) {
  try {
    const { id } = req.params;

    const querySpec = {
      query: `
        SELECT *
        FROM c
        WHERE c.objectType = @objectType
          AND c.id = @id
      `,
      parameters: [
        {
          name: "@objectType",
          value: "connectorDefinition"
        },
        {
          name: "@id",
          value: id
        }
      ]
    };

    const { resources } = await container.items
      .query(querySpec)
      .fetchAll();

    if (resources.length === 0) {
      return res.status(404).json({
        error: "Connector definition not found"
      });
    }

    const existing = resources[0];

    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      objectType: "connectorDefinition",
      updatedAt: new Date().toISOString()
    };

    const { resource } = await container
      .item(id, "connectorDefinition")
      .replace(updated);

    res.status(200).json(cleanCosmosFields(resource));
  } catch (error) {
    next(error);
  }
}
