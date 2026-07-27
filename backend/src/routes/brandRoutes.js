import express from "express";
import * as brandController from "../controllers/brandController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", brandController.getBrands);
router.post("/", requireAdmin, brandController.createBrand);
router.put("/:id", requireAdmin, brandController.updateBrand);
router.delete("/:id", requireAdmin, brandController.deleteBrand);

export default router;
