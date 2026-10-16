import { prisma } from "../config/prisma.js";

/**
 * Records an audit trail entry. Pass the transaction client when called inside $transaction
 * so the log is rolled back together with the change it describes.
 */
export const audit = async (client, user, action, entity, entityId = null, details = null) => {
  const db = client || prisma;
  await db.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action,
      entity,
      entityId: entityId !== null && entityId !== undefined ? String(entityId) : null,
      details: details ?? undefined,
    },
  });
};
