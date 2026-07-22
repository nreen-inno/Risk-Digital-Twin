import express from "express";
import {
  createRawRecord,
  getRawRecords
} from "../controllers/ingestion.controller.js";

const router = express.Router();

router.post("/raw", createRawRecord);
router.get("/raw", getRawRecords);

export default router;
