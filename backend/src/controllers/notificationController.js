import * as notificationService from "../services/notificationService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications();
    return sendSuccess(res, "Notifications retrieved", notifications);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const markRead = async (req, res) => {
  try {
    const notif = await notificationService.markAsRead(req.params.id);
    return sendSuccess(res, "Notification marked as read", notif);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const markAllRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead();
    return sendSuccess(res, "All notifications marked as read");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteNotif = async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id);
    return sendSuccess(res, "Notification deleted");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
