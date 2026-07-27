import { prisma } from "../config/prisma.js";

export const getNotifications = async () => {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

export const markAsRead = async (id) => {
  const notifId = parseInt(id, 10);
  return prisma.notification.update({
    where: { id: notifId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async () => {
  return prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
};

export const deleteNotification = async (id) => {
  const notifId = parseInt(id, 10);
  return prisma.notification.delete({ where: { id: notifId } });
};
