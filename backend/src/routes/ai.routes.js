import express from "express";
import { testAiConnection } from "../controllers/ai.controller.js";

const router = express.Router();

router.get("/test", testAiConnection);

export default router;
