import express from "express";
import rateLimit from "express-rate-limit";
import * as authService from "../services/authService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { changePasswordBody, loginBody } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

// Brute-force protection: 10 failed attempts per 15 minutes per IP + email.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || "").toLowerCase()}`,
  message: { success: false, message: "Too many login attempts. Please wait 15 minutes and try again.", errors: null },
});

router.post(
  "/login",
  loginLimiter,
  validate({ body: loginBody }),
  asyncHandler(async (req, res) => {
    const result = await authService.loginUser(req.body.email, req.body.password);
    return sendSuccess(res, "Login successful", result);
  })
);

router.post("/logout", (req, res) => sendSuccess(res, "Logged out successfully"));

router.get(
  "/me",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, "Current user profile", user);
  })
);

router.post(
  "/change-password",
  authenticateUser,
  validate({ body: changePasswordBody }),
  asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user, req.body);
    return sendSuccess(res, "Password changed successfully", result);
  })
);

export default router;
