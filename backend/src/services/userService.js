import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/appError.js";
import { audit } from "../utils/audit.js";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { sales: true } },
};

export const getAllUsers = async () => {
  return prisma.user.findMany({ select: publicSelect, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: publicSelect });
  if (!user) throw notFound("User not found");
  return user;
};

export const createUser = async (actor, { name, email, password, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw badRequest("Email already registered");

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: role || "CASHIER" },
    select: publicSelect,
  });
  await audit(null, actor, "USER_CREATED", "User", user.id, { email, role: user.role });
  return user;
};

const countOtherActiveAdmins = (excludeId) =>
  prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: excludeId } } });

export const updateUser = async (actor, id, { name, email, password, role, isActive }) => {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw notFound("User not found");

  const losesAdmin = current.role === "ADMIN" && current.isActive && (role === "CASHIER" || isActive === false);
  if (losesAdmin && (await countOtherActiveAdmins(id)) === 0) {
    throw badRequest("At least one active admin account is required");
  }
  if (id === actor.id && isActive === false) throw badRequest("You cannot deactivate your own account");
  if (id === actor.id && role === "CASHIER") throw badRequest("You cannot remove your own admin role");

  if (email && email !== current.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) throw badRequest("Email already registered");
  }

  const data = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({ where: { id }, data, select: publicSelect });
  await audit(null, actor, "USER_UPDATED", "User", id, {
    email: user.email,
    changed: Object.keys(data).filter((k) => k !== "password").concat(password ? ["password"] : []),
  });
  return user;
};

/** Users are deactivated, not deleted, so their sales history keeps its cashier. */
export const deleteUser = async (actor, id) => {
  if (id === actor.id) throw badRequest("You cannot delete your own account");
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw notFound("User not found");
  if (current.role === "ADMIN" && current.isActive && (await countOtherActiveAdmins(id)) === 0) {
    throw badRequest("At least one active admin account is required");
  }
  const user = await prisma.user.update({ where: { id }, data: { isActive: false }, select: publicSelect });
  await audit(null, actor, "USER_DEACTIVATED", "User", id, { email: user.email });
  return user;
};
