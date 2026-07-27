import * as userService from "../services/userService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return sendSuccess(res, "Users retrieved successfully", users);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, "User profile retrieved", user);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return sendError(res, "Name, email, and password are required", 400);
    }
    const user = await userService.createUser({ name, email, password, role });
    return sendSuccess(res, "User created successfully", user, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return sendSuccess(res, "User updated successfully", user);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    return sendSuccess(res, "User deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
