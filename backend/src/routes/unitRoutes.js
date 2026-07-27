import express from "express";
import * as unitController from "../controllers/unitController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", unitController.getUnits);
router.post("/", requireAdmin, unitController.createUnit);
router.put("/:id", requireAdmin, unitController.updateUnit);
router.delete("/:id", requireAdmin, unitController.deleteUnit);

export default router;
