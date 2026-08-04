const stringList = {
  type: "array",
  items: { type: "string" }
};

const alternativeMethod = {
  type: "object",
  additionalProperties: false,
  properties: {
    method: { type: "string" },
    status: {
      type: "string",
      enum: ["recommended", "not-recommended"]
    },
    reason: { type: "string" }
  },
  required: ["method", "status", "reason"]
};

const fieldMapping = {
  type: "object",
  additionalProperties: false,
  properties: {
    canonicalField: { type: "string" },
    sourceField: { type: "string" }
  },
  required: ["canonicalField", "sourceField"]
};

/**
 * Connector Proposal schema (onboarding v2).
 * Strict Azure OpenAI json_schema — every property required, no free-form maps.
 */
export const connectorAdvisorSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    summary: { type: "string" },

    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        provider: { type: "string" },
        sourceType: { type: "string" }
      },
      required: ["name", "provider", "sourceType"]
    },

    recommendation: {
      type: "object",
      additionalProperties: false,
      properties: {
        connectionMethod: {
          type: "string",
          enum: ["rss", "api", "file", "database", "email", "scrape"]
        },
        rationale: { type: "string" },
        alternativeMethods: {
          type: "array",
          items: alternativeMethod
        }
      },
      required: ["connectionMethod", "rationale", "alternativeMethods"]
    },

    technicalConfiguration: {
      type: "object",
      additionalProperties: false,
      properties: {
        endpoint: { type: "string" },
        documentationUrl: { type: "string" },
        authenticationType: {
          type: "string",
          enum: ["none", "apiKey", "oauth2", "basic"]
        },
        pollInterval: { type: "string" },
        responseFormat: { type: "string" },
        fieldMappings: {
          type: "array",
          items: fieldMapping
        }
      },
      required: [
        "endpoint",
        "documentationUrl",
        "authenticationType",
        "pollInterval",
        "responseFormat",
        "fieldMappings"
      ]
    },

    monitoringConfiguration: {
      type: "object",
      additionalProperties: false,
      properties: {
        languages: stringList,
        geographicScope: stringList,
        sensitivity: {
          type: "string",
          enum: ["balanced", "broad", "strict"]
        },
        riskCategoryMappings: stringList,
        monitoringProfile: {
          type: "object",
          additionalProperties: false,
          properties: {
            includeTerms: stringList,
            excludeTerms: stringList,
            entities: stringList,
            locations: stringList
          },
          required: [
            "includeTerms",
            "excludeTerms",
            "entities",
            "locations"
          ]
        }
      },
      required: [
        "languages",
        "geographicScope",
        "sensitivity",
        "riskCategoryMappings",
        "monitoringProfile"
      ]
    },

    retentionRecommendation: {
      type: "object",
      additionalProperties: false,
      properties: {
        storeFeedMetadata: { type: "boolean" },
        storeRawFeedItem: { type: "boolean" },
        scrapeFullArticle: { type: "boolean" },
        reason: { type: "string" }
      },
      required: [
        "storeFeedMetadata",
        "storeRawFeedItem",
        "scrapeFullArticle",
        "reason"
      ]
    },

    automatedValidationPlan: stringList,
    decisionsRequiringUserApproval: stringList,
    unresolvedTechnicalFacts: stringList,
    assumptions: stringList,

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },

    connectorReadiness: {
      type: "string",
      enum: [
        "proposal-ready",
        "ready-for-test",
        "test-failed",
        "ready-for-activation"
      ]
    }
  },

  required: [
    "summary",
    "source",
    "recommendation",
    "technicalConfiguration",
    "monitoringConfiguration",
    "retentionRecommendation",
    "automatedValidationPlan",
    "decisionsRequiringUserApproval",
    "unresolvedTechnicalFacts",
    "assumptions",
    "confidence",
    "connectorReadiness"
  ]
};
