import { prisma } from "../config/prisma.js";

/**
 * Get all notes with optional filtering & search
 */
export const getAllNotes = async (filters = {}) => {
  const { search, status, priority } = filters;

  const where = {};

  if (status === "completed") {
    where.isCompleted = true;
  } else if (status === "pending") {
    where.isCompleted = false;
  }

  if (priority && priority !== "ALL") {
    where.priority = priority.toUpperCase();
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.note.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [
      { isCompleted: "asc" },
      { updatedAt: "desc" },
    ],
  });
};

/**
 * Get single note by ID
 */
export const getNoteById = async (id) => {
  const note = await prisma.note.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!note) throw new Error("Note not found");
  return note;
};

/**
 * Create new note
 */
export const createNote = async (data, userId) => {
  const { title, content, priority, color, dueDate } = data;

  if (!title || !title.trim()) {
    throw new Error("Note title is required");
  }

  return prisma.note.create({
    data: {
      title: title.trim(),
      content: content ? content.trim() : null,
      priority: (priority || "MEDIUM").toUpperCase(),
      color: color || "yellow",
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: userId ? parseInt(userId, 10) : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

/**
 * Update existing note
 */
export const updateNote = async (id, data) => {
  const noteId = parseInt(id, 10);
  const existing = await prisma.note.findUnique({ where: { id: noteId } });
  if (!existing) throw new Error("Note not found");

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.content !== undefined) updateData.content = data.content ? data.content.trim() : null;
  if (data.priority !== undefined) updateData.priority = data.priority.toUpperCase();
  if (data.color !== undefined) updateData.color = data.color;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.isCompleted !== undefined) updateData.isCompleted = Boolean(data.isCompleted);

  return prisma.note.update({
    where: { id: noteId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

/**
 * Toggle completion status
 */
export const toggleNoteCompletion = async (id) => {
  const noteId = parseInt(id, 10);
  const existing = await prisma.note.findUnique({ where: { id: noteId } });
  if (!existing) throw new Error("Note not found");

  return prisma.note.update({
    where: { id: noteId },
    data: { isCompleted: !existing.isCompleted },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

/**
 * Delete note
 */
export const deleteNote = async (id) => {
  const noteId = parseInt(id, 10);
  const existing = await prisma.note.findUnique({ where: { id: noteId } });
  if (!existing) throw new Error("Note not found");

  await prisma.note.delete({ where: { id: noteId } });
  return { message: "Note deleted successfully", id: noteId };
};
