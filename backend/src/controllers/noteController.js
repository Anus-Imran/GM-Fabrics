import * as noteService from "../services/noteService.js";

export const getNotes = async (req, res, next) => {
  try {
    const notes = await noteService.getAllNotes(req.query);
    res.status(200).json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
};

export const getNote = async (req, res, next) => {
  try {
    const note = await noteService.getNoteById(req.params.id);
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const newNote = await noteService.createNote(req.body, userId);
    res.status(201).json({ success: true, data: newNote, message: "Note created successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const updated = await noteService.updateNote(req.params.id, req.body);
    res.status(200).json({ success: true, data: updated, message: "Note updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const toggleNoteStatus = async (req, res, next) => {
  try {
    const updated = await noteService.toggleNoteCompletion(req.params.id);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const result = await noteService.deleteNote(req.params.id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
