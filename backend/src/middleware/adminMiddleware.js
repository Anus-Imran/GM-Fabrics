import { sendError } from "../utils/responseUtil.js";

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return sendError(res, "Access denied. Admin role required.", 403);
  }
  next();
};
