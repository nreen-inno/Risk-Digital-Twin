import express from "express";
import {
  getMonitoringCapabilities,
  getMonitoringCapabilityById
} from "../controllers/monitoringCapabilities.controller.js";

const router = express.Router();

router.get("/", getMonitoringCapabilities);
router.get("/:id", getMonitoringCapabilityById);

export default router;
