import crypto from "node:crypto";
import { container } from "../config/cosmos.js";
import {
    generateConnectorAnalysis
} from "../services/aiConnectorBuilder.service.js";

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

export async function createInformationSource(req, res, next) {
    try {
        const {
            name,
            description = "",
            provider = "",
            sourceKind,
            documentation = "",
            sampleData = null,
            supportedRiskFactorIds = [],
            status = "draft",
            tags = []
        } = req.body;

        if (!name || !sourceKind) {
            return res.status(400).json({
                error: "Validation error",
                message: "Fields 'name' and 'sourceKind' are required."
            });
        }

        const now = new Date().toISOString();

        const informationSource = {
            id: crypto.randomUUID(),
            objectType: "informationSource",
            name,
            description,
            provider,
            sourceKind,
            documentation,
            sampleData,
            supportedRiskFactorIds,
            status,
            tags,
            createdAt: now,
            updatedAt: now
        };

        const { resource } = await container.items.create(informationSource);

        res.status(201).json(cleanCosmosFields(resource));
    } catch (error) {
        next(error);
    }
}

export async function getInformationSources(req, res, next) {
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
          c.supportedRiskFactorIds,
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

export async function getInformationSourceById(req, res, next) {
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
                    value: "informationSource"
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
                error: "Information source not found"
            });
        }

        res.status(200).json(cleanCosmosFields(resources[0]));
    } catch (error) {
        next(error);
    }
}

export async function analyseInformationSource(req, res, next) {
    try {
        const { id } = req.params;

        const sourceQuery = {
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

        const { resources } = await container.items
            .query(sourceQuery)
            .fetchAll();

        if (resources.length === 0) {
            return res.status(404).json({
                error: "Information source not found"
            });
        }

        const source = resources[0];
        const now = new Date().toISOString();

        // const connectorDefinition = buildDraftConnectorDefinition(source, now);
        let connectorAnalysis;
        let generatedBy = "azureOpenAI";

        try {
            connectorAnalysis =
                await generateConnectorAnalysis(source);
        } catch (aiError) {
            console.error(
                "AI connector analysis failed. Using fallback:",
                aiError.message
            );

            connectorAnalysis =
                buildFallbackConnectorAnalysis(source);

            generatedBy = "ruleBasedFallback";
        }

        const connectorDefinition = {
            id: crypto.randomUUID(),
            objectType: "connectorDefinition",
            informationSourceId: source.id,
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
                    ? process.env.AZURE_OPENAI_DEPLOYMENT
                    : null,
            createdAt: now,
            updatedAt: now
        };

        const { resource } = await container.items.create(connectorDefinition);

        res.status(201).json(cleanCosmosFields(resource));
    } catch (error) {
        next(error);
    }
}

function buildFallbackConnectorAnalysis(source, now) {
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
        }
    };

    const defaults =
        defaultsBySourceKind[source.sourceKind] ||
        defaultsBySourceKind.manual;

    return {
        technicalAnalysis: {
            transport: defaults.transport,
            inputFormat: defaults.inputFormat,
            authenticationType: "toBeConfirmed",
            ingestionStrategy: {
                mode: defaults.mode,
                recommendedInterval: defaults.interval,
                reason:
                    "Fallback suggestion based on source kind.",
                supportsIncrementalLoading: false,
                incrementalField: null
            },
            technicalMapping: []
        },
        businessAnalysis: {
            suggestedRiskFactors:
                source.supportedRiskFactorIds || [],
            suggestedRiskDefinitions: [],
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