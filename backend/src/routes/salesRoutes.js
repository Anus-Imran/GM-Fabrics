import express from "express";
import { z } from "zod";
import * as salesController from "../controllers/salesController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createSaleBody, idParam, salesListQuery, voidSaleBody } from "../validation/schemas.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", validate({ query: salesListQuery }), salesController.getSales);
// Accepts a numeric id or a bill number (GM-2026-00001).
router.get("/:id", validate({ params: z.object({ id: z.string().trim().min(1).max(40) }) }), salesController.getSale);
router.post("/", validate({ body: createSaleBody }), salesController.createSale);
router.post("/:id/void", requireAdmin, validate({ params: idParam, body: voidSaleBody }), salesController.voidSale);

export default router;
