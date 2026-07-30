import express from "express";
import * as returnController from "../controllers/returnController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", returnController.getAllReturns);
router.post("/", returnController.createReturn);
router.get("/:id", returnController.getReturn);
router.get("/sale/:saleId", returnController.getSaleReturns);
router.delete("/:id", returnController.deleteReturn);

export default router;

