import express from "express";
import * as userService from "../services/userService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createUserBody, idParam, updateUserBody } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

router.use(authenticateUser, requireAdmin);

router.get("/", asyncHandler(async (req, res) => sendSuccess(res, "Users retrieved successfully", await userService.getAllUsers())));

router.post(
  "/",
  validate({ body: createUserBody }),
  asyncHandler(async (req, res) => sendSuccess(res, "User created successfully", await userService.createUser(req.user, req.body), 201))
);

router.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => sendSuccess(res, "User profile retrieved", await userService.getUserById(req.params.id)))
);

router.put(
  "/:id",
  validate({ params: idParam, body: updateUserBody }),
  asyncHandler(async (req, res) => sendSuccess(res, "User updated successfully", await userService.updateUser(req.user, req.params.id, req.body)))
);

router.delete(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => sendSuccess(res, "User deactivated successfully", await userService.deleteUser(req.user, req.params.id)))
);

export default router;
