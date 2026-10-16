import express from "express";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validate.js";
import { idParam } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

/**
 * Standard CRUD router for small master-data tables (units, categories, brands, expense categories).
 * Everyone can read; only admins can write.
 */
export const buildMasterDataRouter = ({ label, bodySchema, list, create, update, remove }) => {
  const router = express.Router();
  router.use(authenticateUser);

  router.get("/", asyncHandler(async (req, res) => sendSuccess(res, `${label} retrieved successfully`, await list())));

  router.post(
    "/",
    requireAdmin,
    validate({ body: bodySchema }),
    asyncHandler(async (req, res) => sendSuccess(res, `${label} created successfully`, await create(req.body), 201))
  );

  router.put(
    "/:id",
    requireAdmin,
    validate({ params: idParam, body: bodySchema }),
    asyncHandler(async (req, res) => sendSuccess(res, `${label} updated successfully`, await update(req.params.id, req.body)))
  );

  router.delete(
    "/:id",
    requireAdmin,
    validate({ params: idParam }),
    asyncHandler(async (req, res) => {
      await remove(req.params.id);
      return sendSuccess(res, `${label} deleted successfully`);
    })
  );

  return router;
};
