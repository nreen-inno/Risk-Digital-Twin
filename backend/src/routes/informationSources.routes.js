import express from "express";

import {
  createInformationSource,
  createInformationSourceFromRecommendation,
  getInformationSources,
  getInformationSourceById,
  updateInformationSourceBusinessAccess,
  analyseInformationSource
} from "../controllers/informationSources.controller.js";

const router = express.Router();

router.post(
  "/from-recommendation",
  createInformationSourceFromRecommendation
);

router.post(
  "/",
  createInformationSource
);

router.get(
  "/",
  getInformationSources
);

router.patch(
  "/:id/business-access",
  updateInformationSourceBusinessAccess
);

router.get(
  "/:id",
  getInformationSourceById
);

router.post(
  "/:id/analyse",
  analyseInformationSource
);

export default router;
