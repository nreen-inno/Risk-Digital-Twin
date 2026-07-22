import express from "express";
import {
  getSourceRecommendations
} from "../controllers/sourceRecommendations.controller.js";

const router = express.Router();

router.post(
  "/:id/source-recommendations",
  getSourceRecommendations
);

export default router;
