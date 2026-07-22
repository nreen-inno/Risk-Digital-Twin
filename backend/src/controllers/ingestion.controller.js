import { container } from "../config/cosmos.js";
import crypto from "node:crypto";

export async function createRawRecord(req, res, next) {
    try {
        const {
            sourceId = "manual",
            contentType = "application/json",
            payload,
            metadata = {}
        } = req.body;

        if (payload === undefined) {
            return res.status(400).json({
                error: "Validation error",
                message: "Field 'payload' is required."
            });
        }

        const now = new Date().toISOString();

        const rawRecord = {
            id: crypto.randomUUID(),
            objectType: "rawRecord",
            sourceId,
            receivedAt: now,
            contentType,
            processingStatus: "received",
            payload,
            metadata,
            createdAt: now,
            updatedAt: now
        };

        const { resource } = await container.items.create(rawRecord);

        res.status(201).json(resource);
    } catch (error) {
        next(error);
    }
}

export async function getRawRecords(req, res, next) {
    try {
        const querySpec = {
            query: `
        SELECT
      c.id,
      c.objectType,
      c.sourceId,
      c.receivedAt,
      c.contentType,
      c.processingStatus,
      c.payload,
      c.metadata,
      c.createdAt,
      c.updatedAt
        FROM c
        WHERE c.objectType = @objectType
        ORDER BY c.receivedAt DESC
      `,
            parameters: [
                {
                    name: "@objectType",
                    value: "rawRecord"
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
