import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { generateToken } from "../utils/jwtUtil.js";
import { AppError, badRequest, notFound } from "../utils/appError.js";
import { sessionVersion } from "../middleware/authMiddleware.js";
import { audit } from "../utils/audit.js";

// Used to keep response time the same whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync("gmfabrics-timing-guard", 10);

export const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });

  const isPasswordValid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!user || !isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }
  if (!user.isActive) {
    throw new AppError("This account has been deactivated. Contact the shop admin.", 403);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    sv: sessionVersion(user),
  });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  };
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw notFound("User not found");
  return user;
};

export const changePassword = async (actor, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user) throw notFound("User not found");
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw badRequest("Current password is incorrect");
  if (currentPassword === newPassword) throw badRequest("New password must be different from the current one");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });
  await audit(null, actor, "PASSWORD_CHANGED", "User", user.id);

  // Issue a fresh token; old tokens stop working because the session version changed.
  return {
    token: generateToken({ id: updated.id, email: updated.email, role: updated.role, sv: sessionVersion(updated) }),
  };
};
