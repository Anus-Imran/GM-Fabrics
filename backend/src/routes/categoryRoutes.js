import express from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", categoryController.getCategories);
router.post("/", requireAdmin, categoryController.createCategory);
router.put("/:id", requireAdmin, categoryController.updateCategory);
router.delete("/:id", requireAdmin, categoryController.deleteCategory);

export default router;
