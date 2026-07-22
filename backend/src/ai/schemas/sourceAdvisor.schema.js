export const sourceAdvisorSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    summary: {
      type: "string"
    },

    coverageAssessment: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          informationNeed: {
            type: "string"
          },

          coverage: {
            type: "string",
            enum: [
              "strong",
              "partial",
              "missing",
              "unknown"
            ]
          },

          existingSourceIds: {
            type: "array",
            items: {
              type: "string"
            }
          },

          explanation: {
            type: "string"
          }
        },

        required: [
          "informationNeed",
          "coverage",
          "existingSourceIds",
          "explanation"
        ]
      }
    },

    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          id: {
            type: "string"
          },

          name: {
            type: "string"
          },

          provider: {
            type: ["string", "null"]
          },

          informationNeed: {
            type: "string"
          },

          sourceRole: {
            type: "string",
            enum: [
              "internal",
              "external",
              "historical"
            ]
          },

          businessValue: {
            type: "string"
          },

          shortReason: {
            type: "string"
          },

          signals: {
            type: "array",
            items: {
              type: "string"
            }
          },

          availabilityStatus: {
            type: "string",
            enum: [
              "availableNow",
              "registrationRequired",
              "subscriptionRequired",
              "customerAccessRequired",
              "uploadRequired"
            ]
          },

          availabilityLabel: {
            type: "string"
          },

          nextSteps: {
            type: "array",
            items: {
              type: "string"
            }
          },

          limitations: {
            type: "array",
            items: {
              type: "string"
            }
          },

          actions: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "accept",
                "reject",
                "requestAlternative",
                "requestPublicAlternative",
                "confirmExistingAccess",
                "openProviderPage",
                "requestInternalAccess",
                "uploadSample",
                "useSimulatedData"
              ]
            }
          },

          priority: {
            type: "integer",
            minimum: 1,
            maximum: 99
          },

          recommendationType: {
            type: "string",
            enum: [
              "Industry Standard",
              "Best Practice",
              "Compliance",
              "AI Discovery",
              "Customer Specific"
            ]
          },

          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          }
        },

        required: [
          "id",
          "name",
          "provider",
          "informationNeed",
          "sourceRole",
          "businessValue",
          "shortReason",
          "signals",
          "availabilityStatus",
          "availabilityLabel",
          "nextSteps",
          "limitations",
          "actions",
          "priority",
          "recommendationType",
          "confidence"
        ]
      }
    },

    assumptions: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },

  required: [
    "summary",
    "coverageAssessment",
    "recommendations",
    "assumptions"
  ]
};
