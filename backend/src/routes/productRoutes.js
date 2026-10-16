import express from "express";
import { z } from "zod";
import * as productController from "../controllers/productController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createProductBody, updateProductBody, idParam, productListQuery } from "../validation/schemas.js";

const router = express.Router();

router.use(authenticateUser);

const searchQuery = z
  .object({ q: z.string().trim().max(100).optional(), barcode: z.string().trim().max(100).optional() })
  .passthrough();

router.get("/", validate({ query: productListQuery }), productController.getProducts);
router.get("/search", validate({ query: searchQuery }), productController.searchProducts);
router.get("/low-stock", productController.getLowStockProducts);
router.get("/code/:code", validate({ params: z.object({ code: z.string().trim().min(1).max(64) }) }), productController.getByCode);
router.get("/:id", validate({ params: idParam }), productController.getProduct);
router.get("/:id/price-history", requireAdmin, validate({ params: idParam }), productController.getProductPriceHistory);
router.post("/", requireAdmin, validate({ body: createProductBody }), productController.createProduct);
router.put("/:id", requireAdmin, validate({ params: idParam, body: updateProductBody }), productController.updateProduct);
router.delete("/:id", requireAdmin, validate({ params: idParam }), productController.deleteProduct);

export default router;
