import express from "express";
import * as notificationService from "../services/notificationService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { idParam } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

router.use(authenticateUser);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { items, unreadCount } = await notificationService.getNotifications();
    // Opportunistic cleanup of old read notifications (no cron needed on serverless).
    if (Math.random() < 0.05) notificationService.pruneOldNotifications().catch(() => {});
    return res.status(200).json({ success: true, message: "Notifications retrieved", data: items, unreadCount });
  })
);

router.put(
  "/read-all",
  asyncHandler(async (req, res) => sendSuccess(res, "All marked as read", await notificationService.markAllAsRead()))
);

router.put(
  "/:id/read",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => sendSuccess(res, "Marked as read", await notificationService.markAsRead(req.params.id)))
);

router.delete(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Notification deleted", await notificationService.deleteNotification(req.params.id))
  )
);

export default router;
