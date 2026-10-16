import express from "express";
import { z } from "zod";
import * as returnController from "../controllers/returnController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createReturnBody, id, idParam, listQuery } from "../validation/schemas.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", validate({ query: listQuery }), returnController.getAllReturns);
router.post("/", validate({ body: createReturnBody }), returnController.createReturn);
router.get("/sale/:saleId", validate({ params: z.object({ saleId: id }) }), returnController.getSaleReturns);
router.get("/:id", validate({ params: idParam }), returnController.getReturn);
router.delete("/:id", requireAdmin, validate({ params: idParam }), returnController.deleteReturn);

export default router;
