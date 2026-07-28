import express from "express";
import {
  getMonitoringCapabilities,
  getMonitoringCapabilityById,
  getMonitoringCapabilityInformationSources
} from "../controllers/monitoringCapabilities.controller.js";

const router = express.Router();

router.get("/", getMonitoringCapabilities);
router.get(
  "/:id/information-sources",
  getMonitoringCapabilityInformationSources
);
router.get("/:id", getMonitoringCapabilityById);

export default router;
