import express from "express";
import {
  createInformationSource,
  getInformationSources,
  getInformationSourceById,
  analyseInformationSource
} from "../controllers/informationSources.controller.js";

const router = express.Router();

router.post("/", createInformationSource);
router.get("/", getInformationSources);
router.get("/:id", getInformationSourceById);
router.post("/:id/analyse", analyseInformationSource);

export default router;
