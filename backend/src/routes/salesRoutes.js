import express from "express";
import * as salesController from "../controllers/salesController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", salesController.getSales);
router.get("/:id", salesController.getSale);
router.post("/", salesController.createSale);
router.put("/:id/status", salesController.updateStatus);

export default router;
