import express from "express";
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  toggleNoteStatus,
  deleteNote,
} from "../controllers/noteController.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { idParam, noteBody } from "../validation/schemas.js";

const router = express.Router();

router.use(authenticateUser);

router.get("/", getNotes);
router.get("/:id", validate({ params: idParam }), getNote);
router.post("/", validate({ body: noteBody }), createNote);
router.put("/:id", validate({ params: idParam, body: noteBody.partial() }), updateNote);
router.patch("/:id/toggle", validate({ params: idParam }), toggleNoteStatus);
router.delete("/:id", validate({ params: idParam }), deleteNote);

export default router;
