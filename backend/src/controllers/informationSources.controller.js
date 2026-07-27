import crypto from "node:crypto";

import { container } from "../config/cosmos.js";
import {
  generateConnectorAnalysis
} from "../services/aiConnectorBuilder.service.js";

function cleanCosmosFields(item) {
  if (!item) {
    return item;
  }

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

function normaliseStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normaliseOptionalNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function buildDefaultBusinessAccess() {
  return {
    accessKnown: "unknown",
    organisationHasSubscription: "unknown",
    internalOwner: "",
    contactDepartment: "",
    providerPortal: "",
    notes: "",
    decisionStatus: "pending",
    updatedAt: null
  };
}

async function findInformationSourceById(id) {
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
        value: "informationSource"
      },
      {
        name: "@id",
        value: id
      }
    ]
  };

  const { resources } =
    await container.items
      .query(querySpec)
      .fetchAll();

  return resources[0] || null;
}

export async function createInformationSource(
  req,
  res,
  next
) {
  try {
    const {
      name,
      description = "",
      provider = "",

      sourceKind = "manual",
      documentation = "",
      documentationUrl = "",
      sampleData = null,
      supportedRiskFactorIds = [],
      tags = [],

      monitoringObjectiveIds = [],
      informationNeed = "",
      relatedRiskDefinitionIds = [],

      origin = "manual",
      sourceRecommendationId = null,
      recommendationType = null,
      recommendationPriority = null,
      recommendationConfidence = null,
      businessValue = "",
      shortReason = "",

      sourceRole = "external",
      availabilityStatus = "unknown",
      availabilityLabel = "",
      accessState = "notConfirmed",
      nextSteps = [],
      limitations = [],

      businessAccess = null,

      status = "draft"
    } = req.body || {};

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        error: "Validation error",
        message: "Field 'name' is required."
      });
    }

    const allowedSourceRoles = [
      "internal",
      "external",
      "historical"
    ];

    if (!allowedSourceRoles.includes(sourceRole)) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "Field 'sourceRole' must be internal, external or historical."
      });
    }

    const allowedAvailabilityStatuses = [
      "availableNow",
      "registrationRequired",
      "subscriptionRequired",
      "customerAccessRequired",
      "uploadRequired",
      "unknown"
    ];

    if (
      !allowedAvailabilityStatuses.includes(
        availabilityStatus
      )
    ) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "Field 'availabilityStatus' contains an unsupported value."
      });
    }

    const now = new Date().toISOString();

    const defaultBusinessAccess =
      buildDefaultBusinessAccess();

    const informationSource = {
      id: crypto.randomUUID(),
      objectType: "informationSource",

      name: name.trim(),
      description,
      provider,

      sourceKind,
      sourceRole,

      documentation,
      documentationUrl,
      sampleData,

      monitoringObjectiveIds:
        normaliseStringArray(
          monitoringObjectiveIds
        ),

      informationNeed,

      supportedRiskFactorIds:
        normaliseStringArray(
          supportedRiskFactorIds
        ),

      relatedRiskDefinitionIds:
        normaliseStringArray(
          relatedRiskDefinitionIds
        ),

      origin,
      sourceRecommendationId,

      recommendationType,

      recommendationPriority:
        normaliseOptionalNumber(
          recommendationPriority
        ),

      recommendationConfidence:
        normaliseOptionalNumber(
          recommendationConfidence
        ),

      businessValue,
      shortReason,

      availabilityStatus,
      availabilityLabel,
      accessState,

      nextSteps:
        normaliseStringArray(nextSteps),

      limitations:
        normaliseStringArray(limitations),

      status,

      tags:
        normaliseStringArray(tags),

      connectorStatus: "notConfigured",
      requiresUserReview: true,

      businessAccess: {
        ...defaultBusinessAccess,

        organisationHasSubscription:
          availabilityStatus === "availableNow"
            ? "notRequired"
            : defaultBusinessAccess
                .organisationHasSubscription,

        ...(businessAccess &&
        typeof businessAccess === "object"
          ? businessAccess
          : {})
      },

      createdAt: now,
      updatedAt: now
    };

    const { resource } =
      await container.items.create(
        informationSource
      );

    res
      .status(201)
      .json(cleanCosmosFields(resource));
  } catch (error) {
    next(error);
  }
}

export async function createInformationSourceFromRecommendation(
  req,
  res,
  next
) {
  try {
    const {
      monitoringObjectiveId,
      recommendation
    } = req.body || {};

    if (
      !monitoringObjectiveId ||
      typeof monitoringObjectiveId !== "string"
    ) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "Field 'monitoringObjectiveId' is required."
      });
    }

    if (
      !recommendation ||
      typeof recommendation !== "object"
    ) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "Field 'recommendation' is required."
      });
    }

    const {
      id: sourceRecommendationId,
      name,
      provider = "",
      informationNeed = "",
      sourceRole = "external",
      businessValue = "",
      shortReason = "",
      availabilityStatus = "unknown",
      availabilityLabel = "",
      recommendationType = null,
      priority = null,
      confidence = null,
      nextSteps = [],
      limitations = []
    } = recommendation;

    if (
      !sourceRecommendationId ||
      !name
    ) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "Recommendation fields 'id' and 'name' are required."
      });
    }

    const duplicateQuery = {
      query: `
        SELECT *
        FROM c
        WHERE c.objectType = @objectType
          AND c.sourceRecommendationId =
              @sourceRecommendationId
          AND ARRAY_CONTAINS(
            c.monitoringObjectiveIds,
            @monitoringObjectiveId
          )
      `,
      parameters: [
        {
          name: "@objectType",
          value: "informationSource"
        },
        {
          name: "@sourceRecommendationId",
          value: sourceRecommendationId
        },
        {
          name: "@monitoringObjectiveId",
          value: monitoringObjectiveId
        }
      ]
    };

    const { resources: existingSources } =
      await container.items
        .query(duplicateQuery)
        .fetchAll();

    if (existingSources.length > 0) {
      return res.status(200).json({
        created: false,
        duplicate: true,
        item: cleanCosmosFields(
          existingSources[0]
        )
      });
    }

    const allowedSourceRoles = [
      "internal",
      "external",
      "historical"
    ];

    const safeSourceRole =
      allowedSourceRoles.includes(sourceRole)
        ? sourceRole
        : "external";

    const now = new Date().toISOString();

    const informationSource = {
      id: crypto.randomUUID(),
      objectType: "informationSource",

      name: String(name).trim(),
      description: shortReason,
      provider,

      sourceKind: "toBeConfirmed",
      sourceRole: safeSourceRole,

      documentation: "",
      documentationUrl: "",
      sampleData: null,

      monitoringObjectiveIds: [
        monitoringObjectiveId
      ],

      informationNeed,

      supportedRiskFactorIds: [],
      relatedRiskDefinitionIds: [],

      origin: "aiSourceAdvisor",
      sourceRecommendationId,

      recommendationType,

      recommendationPriority:
        normaliseOptionalNumber(priority),

      recommendationConfidence:
        normaliseOptionalNumber(confidence),

      businessValue,
      shortReason,

      availabilityStatus,
      availabilityLabel,
      accessState: "notConfirmed",

      nextSteps:
        normaliseStringArray(nextSteps),

      limitations:
        normaliseStringArray(limitations),

      status: "draft",
      tags: [],

      connectorStatus: "notConfigured",
      requiresUserReview: true,

      businessAccess: {
        ...buildDefaultBusinessAccess(),

        organisationHasSubscription:
          availabilityStatus === "availableNow"
            ? "notRequired"
            : "unknown"
      },

      createdAt: now,
      updatedAt: now
    };

    const { resource } =
      await container.items.create(
        informationSource
      );

    res.status(201).json({
      created: true,
      duplicate: false,
      item: cleanCosmosFields(resource)
    });
  } catch (error) {
    next(error);
  }
}

export async function getInformationSources(
  req,
  res,
  next
) {
  try {
    const querySpec = {
      query: `
        SELECT
          c.id,
          c.objectType,
          c.name,
          c.description,
          c.provider,
          c.sourceKind,
          c.sourceRole,
          c.monitoringObjectiveIds,
          c.informationNeed,
          c.supportedRiskFactorIds,
          c.relatedRiskDefinitionIds,
          c.origin,
          c.sourceRecommendationId,
          c.recommendationType,
          c.recommendationPriority,
          c.recommendationConfidence,
          c.businessValue,
          c.shortReason,
          c.availabilityStatus,
          c.availabilityLabel,
          c.accessState,
          c.nextSteps,
          c.limitations,
          c.businessAccess,
          c.connectorStatus,
          c.requiresUserReview,
          c.status,
          c.tags,
          c.createdAt,
          c.updatedAt
        FROM c
        WHERE c.objectType = @objectType
        ORDER BY c.createdAt DESC
      `,
      parameters: [
        {
          name: "@objectType",
          value: "informationSource"
        }
      ]
    };

    const { resources } =
      await container.items
        .query(querySpec)
        .fetchAll();

    res.status(200).json({
      count: resources.length,
      items: resources.map(
        cleanCosmosFields
      )
    });
  } catch (error) {
    next(error);
  }
}

export async function getInformationSourceById(
  req,
  res,
  next
) {
  try {
    const source =
      await findInformationSourceById(
        req.params.id
      );

    if (!source) {
      return res.status(404).json({
        error: "Information source not found"
      });
    }

    res
      .status(200)
      .json(cleanCosmosFields(source));
  } catch (error) {
    next(error);
  }
}

export async function updateInformationSourceBusinessAccess(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;

    const {
      accessKnown,
      organisationHasSubscription,
      internalOwner,
      contactDepartment,
      providerPortal,
      notes,
      decisionStatus
    } = req.body || {};

    const allowedAccessKnown = [
      "yes",
      "no",
      "unknown"
    ];

    const allowedSubscriptionStates = [
      "yes",
      "no",
      "unknown",
      "notRequired"
    ];

    const allowedDecisionStatuses = [
      "pending",
      "accessAvailable",
      "actionRequired",
      "notProceeding"
    ];

    if (
      accessKnown !== undefined &&
      !allowedAccessKnown.includes(
        accessKnown
      )
    ) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "accessKnown must be yes, no or unknown."
      });
    }

    if (
      organisationHasSubscription !==
        undefined &&
      !allowedSubscriptionStates.includes(
        organisationHasSubscription
      )
    ) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "organisationHasSubscription must be yes, no, unknown or notRequired."
      });
    }

    if (
      decisionStatus !== undefined &&
      !allowedDecisionStatuses.includes(
        decisionStatus
      )
    ) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "decisionStatus contains an unsupported value."
      });
    }

    const source =
      await findInformationSourceById(id);

    if (!source) {
      return res.status(404).json({
        error: "Information source not found"
      });
    }

    const now = new Date().toISOString();

    const currentBusinessAccess = {
      ...buildDefaultBusinessAccess(),
      ...(source.businessAccess || {})
    };

    source.businessAccess = {
      ...currentBusinessAccess,

      ...(accessKnown !== undefined
        ? { accessKnown }
        : {}),

      ...(organisationHasSubscription !==
      undefined
        ? {
            organisationHasSubscription
          }
        : {}),

      ...(internalOwner !== undefined
        ? {
            internalOwner:
              String(internalOwner).trim()
          }
        : {}),

      ...(contactDepartment !== undefined
        ? {
            contactDepartment:
              String(
                contactDepartment
              ).trim()
          }
        : {}),

      ...(providerPortal !== undefined
        ? {
            providerPortal:
              String(providerPortal).trim()
          }
        : {}),

      ...(notes !== undefined
        ? {
            notes:
              String(notes).trim()
          }
        : {}),

      ...(decisionStatus !== undefined
        ? { decisionStatus }
        : {}),

      updatedAt: now
    };

    source.updatedAt = now;

    const { resource } =
      await container
        .item(
          source.id,
          source.objectType
        )
        .replace(source);

    res
      .status(200)
      .json(cleanCosmosFields(resource));
  } catch (error) {
    next(error);
  }
}

export async function analyseInformationSource(
  req,
  res,
  next
) {
  try {
    const source =
      await findInformationSourceById(
        req.params.id
      );

    if (!source) {
      return res.status(404).json({
        error: "Information source not found"
      });
    }

    const now = new Date().toISOString();

    let connectorAnalysis;
    let generatedBy = "azureOpenAI";

    try {
      connectorAnalysis =
        await generateConnectorAnalysis(
          source
        );
    } catch (aiError) {
      console.error(
        "AI connector analysis failed. Using fallback:",
        aiError.message
      );

      connectorAnalysis =
        buildFallbackConnectorAnalysis(
          source
        );

      generatedBy = "ruleBasedFallback";
    }

    const connectorDefinition = {
      id: crypto.randomUUID(),
      objectType: "connectorDefinition",

      informationSourceId: source.id,

      monitoringObjectiveIds:
        source.monitoringObjectiveIds || [],

      informationNeed:
        source.informationNeed || "",

      name: `${source.name} Connector`,
      status: "aiDraft",
      generatedBy,

      technicalAnalysis:
        connectorAnalysis.technicalAnalysis,

      businessAnalysis:
        connectorAnalysis.businessAnalysis,

      dataQuality:
        connectorAnalysis.dataQuality,

      confidence:
        connectorAnalysis.confidence,

      requiresUserReview: true,

      aiModel:
        generatedBy === "azureOpenAI"
          ? process.env
              .AZURE_OPENAI_DEPLOYMENT
          : null,

      createdAt: now,
      updatedAt: now
    };

    const { resource } =
      await container.items.create(
        connectorDefinition
      );

    res
      .status(201)
      .json(cleanCosmosFields(resource));
  } catch (error) {
    next(error);
  }
}

function buildFallbackConnectorAnalysis(
  source
) {
  const defaultsBySourceKind = {
    restApi: {
      transport: "http",
      inputFormat: "json",
      ingestionMode: "polling",
      recommendedInterval: "PT6H"
    },

    rss: {
      transport: "http",
      inputFormat: "xml",
      ingestionMode: "polling",
      recommendedInterval: "PT1H"
    },

    csv: {
      transport: "file",
      inputFormat: "csv",
      ingestionMode: "fileImport",
      recommendedInterval: "manual"
    },

    excel: {
      transport: "file",
      inputFormat: "xlsx",
      ingestionMode: "fileImport",
      recommendedInterval: "manual"
    },

    database: {
      transport: "database",
      inputFormat: "records",
      ingestionMode: "databaseQuery",
      recommendedInterval: "PT6H"
    },

    manual: {
      transport: "manual",
      inputFormat: "json",
      ingestionMode: "manual",
      recommendedInterval: "manual"
    },

    commercialService: {
      transport: "toBeConfirmed",
      inputFormat: "toBeConfirmed",
      ingestionMode: "toBeConfirmed",
      recommendedInterval: "toBeConfirmed"
    },

    toBeConfirmed: {
      transport: "toBeConfirmed",
      inputFormat: "toBeConfirmed",
      ingestionMode: "toBeConfirmed",
      recommendedInterval: "toBeConfirmed"
    }
  };

  const defaults =
    defaultsBySourceKind[
      source.sourceKind
    ] ||
    defaultsBySourceKind.manual;

  return {
    technicalAnalysis: {
      transport: defaults.transport,
      inputFormat:
        defaults.inputFormat,

      authenticationType:
        "toBeConfirmed",

      ingestionStrategy: {
        mode:
          defaults.ingestionMode,

        recommendedInterval:
          defaults.recommendedInterval,

        reason:
          "Fallback suggestion based on source kind.",

        supportsIncrementalLoading:
          false,

        incrementalField: null
      },

      technicalMapping: []
    },

    businessAnalysis: {
      monitoringObjectiveIds:
        source.monitoringObjectiveIds ||
        [],

      informationNeed:
        source.informationNeed || "",

      suggestedRiskFactors:
        source.supportedRiskFactorIds ||
        [],

      suggestedRiskDefinitions:
        source
          .relatedRiskDefinitionIds ||
        [],

      suggestedEntityTypes: [],

      suggestedKnowledgeObjectTypes: [
        "observation",
        "incident",
        "evidence"
      ]
    },

    dataQuality: {
      missingInformation: [
        "AI analysis was unavailable."
      ],

      assumptions: [],

      validationRules: []
    },

    confidence: 0.3
  };
}
