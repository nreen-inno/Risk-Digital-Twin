export const connectorAdvisorSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    readiness: {
      type: "string",
      enum: [
        "ready",
        "partiallyReady",
        "actionRequired",
        "unknown"
      ]
    },

    summary: {
      type: "string"
    },

    recommendedApproach: {
      type: "object",
      additionalProperties: false,

      properties: {
        connectionMethod: {
          type: "string"
        },

        refreshFrequency: {
          type: "string"
        },

        expectedData: {
          type: "array",
          items: {
            type: "string"
          }
        },

        rationale: {
          type: "string"
        }
      },

      required: [
        "connectionMethod",
        "refreshFrequency",
        "expectedData",
        "rationale"
      ]
    },

    requiredBeforeConnection: {
      type: "array",
      items: {
        type: "string"
      }
    },

    missingInformation: {
      type: "array",
      items: {
        type: "string"
      }
    },

    assumptions: {
      type: "array",
      items: {
        type: "string"
      }
    },

    estimatedComplexity: {
      type: "string",
      enum: [
        "low",
        "medium",
        "high",
        "unknown"
      ]
    },

    canGenerateConnectorDefinition: {
      type: "boolean"
    },

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    }
  },

  required: [
    "readiness",
    "summary",
    "recommendedApproach",
    "requiredBeforeConnection",
    "missingInformation",
    "assumptions",
    "estimatedComplexity",
    "canGenerateConnectorDefinition",
    "confidence"
  ]
};
