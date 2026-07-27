import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", notificationController.getNotifications);
router.put("/read-all", notificationController.markAllRead);
router.put("/:id/read", notificationController.markRead);
router.delete("/:id", notificationController.deleteNotif);

export default router;
