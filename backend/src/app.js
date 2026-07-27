import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { database, container } from "./config/cosmos.js";
import ingestionRoutes from "./routes/ingestion.routes.js";
import informationSourceRoutes from "./routes/informationSources.routes.js";
import connectorDefinitionRoutes from "./routes/connectorDefinitions.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import monitoringCapabilityRoutes from "./routes/monitoringCapabilities.routes.js";
import sourceRecommendationRoutes from "./routes/sourceRecommendations.routes.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "Risk Digital Twin API",
        timestamp: new Date().toISOString()
    });
});
app.get("/api/health/database", async (req, res, next) => {
    try {
        const { resource: databaseInfo } = await database.read();
        const { resource: containerInfo } = await container.read();

        res.status(200).json({
            status: "ok",
            service: "Azure Cosmos DB",
            database: databaseInfo.id,
            container: containerInfo.id,
            partitionKey: containerInfo.partitionKey?.paths?.[0] || null,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

app.use("/api/ingestion", ingestionRoutes);
app.use("/api/information-sources", informationSourceRoutes);
app.use("/api/connector-definitions", connectorDefinitionRoutes);
app.use("/api/monitoring-capabilities", monitoringCapabilityRoutes);
app.use("/api/monitoring-capabilities", sourceRecommendationRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
    res.status(404).json({
        error: "Route not found"
    });
});

app.use((error, req, res, next) => {
    console.error(error);

    res.status(500).json({
        error: "Internal server error",
        message:
            process.env.NODE_ENV === "development"
                ? error.message
                : undefined
    });
});

export default app;
