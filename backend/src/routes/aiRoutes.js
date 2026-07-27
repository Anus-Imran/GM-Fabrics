import express from "express";
import * as aiController from "../controllers/aiController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.post("/query", aiController.queryAiAssistant);
router.get("/daily-summary", aiController.getDailySummary);
router.get("/low-stock-suggestions", aiController.getLowStockSuggestions);
router.get("/demand-forecast", aiController.getDemandForecast);
router.get("/customer-insights", aiController.getCustomerInsights);
router.post("/anomaly-check", aiController.checkAnomalies);
router.get("/logs", requireAdmin, aiController.getAiLogs);

export default router;
