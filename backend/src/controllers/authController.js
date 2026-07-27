import * as authService from "../services/authService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    const result = await authService.loginUser(email, password);
    return sendSuccess(res, "Login successful", result);
  } catch (error) {
    return sendError(res, error.message, 401);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, "Current user profile", user);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const logout = async (req, res) => {
  return sendSuccess(res, "Logged out successfully");
};
