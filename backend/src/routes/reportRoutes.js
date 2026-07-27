import express from "express";
import * as reportController from "../controllers/reportController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/dashboard", reportController.getDashboardKpis);
router.get("/sales", reportController.getSalesReport);
router.get("/inventory", reportController.getInventoryReport);
router.get("/profit-loss", reportController.getProfitLossReport);
router.get("/top-products", reportController.getTopProductsReport);

export default router;
