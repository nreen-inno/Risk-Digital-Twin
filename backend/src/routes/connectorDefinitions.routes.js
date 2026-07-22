import express from "express";
import {
  getConnectorDefinitions,
  getConnectorDefinitionById,
  updateConnectorDefinition
} from "../controllers/connectorDefinitions.controller.js";

const router = express.Router();

router.get("/", getConnectorDefinitions);
router.get("/:id", getConnectorDefinitionById);
router.patch("/:id", updateConnectorDefinition);

export default router;
