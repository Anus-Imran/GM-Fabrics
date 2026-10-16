import { verifyToken } from "../utils/jwtUtil.js";
import { sendError } from "../utils/responseUtil.js";
import { prisma } from "../config/prisma.js";

// Changes whenever the user row is updated (password, role, deactivation), which invalidates old tokens.
export const sessionVersion = (user) => String(new Date(user.updatedAt).getTime());

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Authentication required. Please log in.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, "Your account is not active. Please log in again.", 401);
    }

    if (decoded.sv && decoded.sv !== sessionVersion(user)) {
      return sendError(res, "Your account was updated. Please log in again.", 401);
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (error) {
    return sendError(res, "Invalid or expired token.", 401);
  }
};
