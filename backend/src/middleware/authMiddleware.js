import { verifyToken } from "../utils/jwtUtil.js";
import { sendError } from "../utils/responseUtil.js";
import { prisma } from "../config/prisma.js";

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
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return sendError(res, "Invalid session user not found.", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, "Invalid or expired token.", 401);
  }
};
