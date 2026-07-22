import {
  aiClient,
  AZURE_OPENAI_DEPLOYMENT
} from "../config/ai.js";

const connectorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    technicalAnalysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        transport: {
          type: "string"
        },
        inputFormat: {
          type: "string"
        },
        authenticationType: {
          type: "string"
        },
        ingestionStrategy: {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: {
              type: "string"
            },
            recommendedInterval: {
              type: "string"
            },
            reason: {
              type: "string"
            },
            supportsIncrementalLoading: {
              type: "boolean"
            },
            incrementalField: {
              type: ["string", "null"]
            }
          },
          required: [
            "mode",
            "recommendedInterval",
            "reason",
            "supportsIncrementalLoading",
            "incrementalField"
          ]
        },
        technicalMapping: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              sourcePath: {
                type: "string"
              },
              targetField: {
                type: "string"
              },
              transformation: {
                type: ["string", "null"]
              }
            },
            required: [
              "sourcePath",
              "targetField",
              "transformation"
            ]
          }
        }
      },
      required: [
        "transport",
        "inputFormat",
        "authenticationType",
        "ingestionStrategy",
        "technicalMapping"
      ]
    },
    businessAnalysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        suggestedRiskFactors: {
          type: "array",
          items: {
            type: "string"
          }
        },
        suggestedRiskDefinitions: {
          type: "array",
          items: {
            type: "string"
          }
        },
        suggestedEntityTypes: {
          type: "array",
          items: {
            type: "string"
          }
        },
        suggestedKnowledgeObjectTypes: {
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: [
        "suggestedRiskFactors",
        "suggestedRiskDefinitions",
        "suggestedEntityTypes",
        "suggestedKnowledgeObjectTypes"
      ]
    },
    dataQuality: {
      type: "object",
      additionalProperties: false,
      properties: {
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
        validationRules: {
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: [
        "missingInformation",
        "assumptions",
        "validationRules"
      ]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    }
  },
  required: [
    "technicalAnalysis",
    "businessAnalysis",
    "dataQuality",
    "confidence"
  ]
};

export async function generateConnectorAnalysis(source) {
  const response = await aiClient.responses.create({
    model: AZURE_OPENAI_DEPLOYMENT,
    instructions: `
You are the AI Connector Builder for an enterprise Risk Digital Twin.

Analyse the supplied information source and create a draft connector analysis.

Keep these distinctions:
- The information source is the provider or system.
- Weather, commodity prices, politics, supplier capacity and similar concepts are risk factors, not sources.
- One source may provide evidence for several risk factors.
- Incoming records normally map to observations, incidents, evidence or entities.
- Do not force every incoming record into a risk instance.
- Recommend polling, webhook, listening, streaming, file import, database query or manual import according to the source capabilities.
- Do not invent endpoints, credentials or undocumented capabilities.
- Put uncertain conclusions into assumptions or missingInformation.
- Return only JSON matching the required schema.
    `.trim(),
    input: JSON.stringify(
      {
        name: source.name,
        description: source.description,
        provider: source.provider,
        sourceKind: source.sourceKind,
        documentation: source.documentation,
        sampleData: source.sampleData,
        supportedRiskFactorIds:
          source.supportedRiskFactorIds || [],
        tags: source.tags || []
      },
      null,
      2
    ),
    text: {
      format: {
        type: "json_schema",
        name: "connector_analysis",
        strict: true,
        schema: connectorSchema
      }
    }
  });

  if (!response.output_text) {
    throw new Error("AI returned no connector analysis.");
  }

  return JSON.parse(response.output_text);
}
