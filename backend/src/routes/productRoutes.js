import express from "express";
import * as productController from "../controllers/productController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", productController.getProducts);
router.get("/search", productController.searchProducts);
router.get("/low-stock", productController.getLowStockProducts);
router.get("/:id", productController.getProduct);
router.get("/:id/price-history", productController.getProductPriceHistory);
router.post("/", requireAdmin, productController.createProduct);
router.put("/:id", requireAdmin, productController.updateProduct);
router.delete("/:id", requireAdmin, productController.deleteProduct);

export default router;
