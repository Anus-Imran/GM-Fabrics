import express from "express";
import * as cashSessionService from "../services/cashSessionService.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { closeSessionBody, idParam, listQuery, openSessionBody } from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseUtil.js";

const router = express.Router();

router.use(authenticateUser);

router.get(
  "/current",
  asyncHandler(async (req, res) => sendSuccess(res, "Current cash session", await cashSessionService.getCurrentSession()))
);

router.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => sendSuccess(res, "Cash sessions retrieved", await cashSessionService.getSessions(req.query)))
);

router.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => sendSuccess(res, "Cash session report", await cashSessionService.getSessionById(req.params.id)))
);

router.post(
  "/open",
  validate({ body: openSessionBody }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Cash drawer opened", await cashSessionService.openSession(req.user, req.body), 201)
  )
);

router.post(
  "/:id/close",
  validate({ params: idParam, body: closeSessionBody }),
  asyncHandler(async (req, res) =>
    sendSuccess(res, "Day closed — Z-report saved", await cashSessionService.closeSession(req.user, req.params.id, req.body))
  )
);

export default router;
