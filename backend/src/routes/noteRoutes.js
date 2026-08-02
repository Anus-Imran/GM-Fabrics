import express from "express";
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  toggleNoteStatus,
  deleteNote,
} from "../controllers/noteController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getNotes);
router.get("/:id", getNote);
router.post("/", createNote);
router.put("/:id", updateNote);
router.patch("/:id/toggle", toggleNoteStatus);
router.delete("/:id", deleteNote);

export default router;
