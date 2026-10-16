import { prisma } from "../config/prisma.js";

export const getNotifications = async () => {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);
  // Array for backwards compatibility; unread count is attached as a property in the controller.
  return { items, unreadCount };
};

export const markAsRead = async (id) => {
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
};

export const markAllAsRead = async () => {
  return prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
};

export const deleteNotification = async (id) => {
  return prisma.notification.delete({ where: { id } });
};

// Keep the table small: read notifications older than 60 days are removed.
export const pruneOldNotifications = async () => {
  const cutoff = new Date(Date.now() - 60 * 86400000);
  return prisma.notification.deleteMany({ where: { isRead: true, createdAt: { lt: cutoff } } });
};
