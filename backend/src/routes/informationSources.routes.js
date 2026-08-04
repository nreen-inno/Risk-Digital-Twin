import express from "express";

import {
  createInformationSource,
  createInformationSourceFromRecommendation,
  getInformationSources,
  getInformationSourceById,
  updateInformationSourceBusinessAccess,
  analyseInformationSource,
  getInformationSourceAccessGuidance,
  getInformationSourceConnectorAdvice,
  updateInformationSourceStatus,
  findInformationSourceById
} from "../controllers/informationSources.controller.js";

import { createConnectorLifecycleHandlers } from "../controllers/connectorLifecycle.controller.js";

const router = express.Router();

const {
  acceptConnectorSpecificationHandler,
  testConnectorHandler,
  getRawRecordsHandler,
  getConnectorStatusHandler,
  approveSampleHandler
} = createConnectorLifecycleHandlers({
  findInformationSourceById
});

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
  "/:id/access-guidance",
  getInformationSourceAccessGuidance
);
router.post(
  "/:id/connector-advice",
  getInformationSourceConnectorAdvice
);
router.post(
  "/:id/accept-connector-specification",
  acceptConnectorSpecificationHandler
);
router.post(
  "/:id/connector/test",
  testConnectorHandler
);
router.post(
  "/:id/approve-sample",
  approveSampleHandler
);
router.get(
  "/:id/raw-records",
  getRawRecordsHandler
);
router.get(
  "/:id/connector-status",
  getConnectorStatusHandler
);
router.patch(
  "/:id/status",
  updateInformationSourceStatus
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
