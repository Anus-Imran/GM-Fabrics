"use client";

import React, { useState, useEffect } from "react";
import {
  StickyNote,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit3,
  AlertTriangle,
  Calendar,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";
import api from "../../../services/apiService.js";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Loader } from "../../../components/common/loader.jsx";
import { formatDate } from "../../../utils/formatDate.js";
import {
  showToastSuccess,
  showToastError,
  confirmDelete,
} from "../../../utils/alerts.js";

const COLOR_PRESETS = [
  { id: "yellow", name: "Amber / Yellow", bg: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200", dot: "bg-amber-500" },
  { id: "blue", name: "Sky / Blue", bg: "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200", dot: "bg-blue-500" },
  { id: "emerald", name: "Emerald / Green", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200", dot: "bg-emerald-500" },
  { id: "purple", name: "Purple / Indigo", bg: "bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200", dot: "bg-purple-500" },
  { id: "rose", name: "Rose / Red", bg: "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200", dot: "bg-rose-500" },
];

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "completed"
  const [priorityFilter, setPriorityFilter] = useState("ALL"); // "ALL" | "HIGH" | "MEDIUM" | "LOW"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "MEDIUM",
    color: "yellow",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Individual Action Loading States
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notes");
      if (res.data?.success) {
        setNotes(res.data.data || []);
      } else if (Array.isArray(res.data)) {
        setNotes(res.data);
      }
    } catch (err) {
      console.error("Fetch notes error:", err);
      showToastError("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingNote(null);
    setFormData({
      title: "",
      content: "",
      priority: "MEDIUM",
      color: "yellow",
      dueDate: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title || "",
      content: note.content || "",
      priority: note.priority || "MEDIUM",
      color: note.color || "yellow",
      dueDate: note.dueDate ? new Date(note.dueDate).toISOString().split("T")[0] : "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToastError("Please enter a title for the note");
      return;
    }

    setSubmitting(true);
    try {
      if (editingNote) {
        await api.put(`/notes/${editingNote.id}`, formData);
        showToastSuccess("Note updated successfully");
      } else {
        await api.post("/notes", formData);
        showToastSuccess("New note created");
      }
      setIsModalOpen(false);
      fetchNotes();
    } catch (err) {
      console.error("Save note error:", err);
      showToastError(err.response?.data?.message || "Failed to save note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (note) => {
    if (togglingId === note.id) return;
    setTogglingId(note.id);
    try {
      // Optimistic update
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, isCompleted: !n.isCompleted } : n))
      );
      await api.patch(`/notes/${note.id}/toggle`);
      showToastSuccess(
        note.isCompleted ? "Marked as pending" : "Task marked as completed! 🎉"
      );
    } catch (err) {
      console.error("Toggle note status error:", err);
      fetchNotes(); // Revert
      showToastError("Failed to update task status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteNote = async (id) => {
    if (deletingId === id) return;

    const isConfirmed = await confirmDelete(
      "Delete this Note?",
      "Are you sure you want to delete this note/task?"
    );
    if (!isConfirmed) return;

    setDeletingId(id);
    try {
      await api.delete(`/notes/${id}`);
      showToastSuccess("Note deleted successfully");
      fetchNotes();
    } catch (err) {
      console.error("Delete note error:", err);
      showToastError("Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Notes Calculation
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !searchTerm ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "completed"
        ? n.isCompleted
        : !n.isCompleted;

    const matchesPriority =
      priorityFilter === "ALL" ? true : n.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Summary Metrics
  const totalNotes = notes.length;
  const pendingNotes = notes.filter((n) => !n.isCompleted).length;
  const completedNotes = notes.filter((n) => n.isCompleted).length;
  const highPriorityNotes = notes.filter((n) => n.priority === "HIGH" && !n.isCompleted).length;
  const completionRate = totalNotes > 0 ? Math.round((completedNotes / totalNotes) * 100) : 0;

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "HIGH":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "LOW":
        return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
      default:
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }
  };

  const getColorThemeClass = (color) => {
    const preset = COLOR_PRESETS.find((c) => c.id === color);
    return preset ? preset.bg : COLOR_PRESETS[0].bg;
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <StickyNote className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
              Notes & Shop To-Do Tasks
            </h1>
            <p className="text-xs text-zinc-500 truncate">
              Keep track of fabric order notes, daily store reminders, customer requests & tasks
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenAddModal}
          size="md"
          className="flex items-center justify-center gap-2 font-bold shadow-md cursor-pointer shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Note / Task</span>
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Notes */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Notes</p>
            <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{totalNotes}</h3>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <StickyNote className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingNotes}</h3>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completedNotes}</h3>
            <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">{completionRate}% Done</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* High Priority */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">High Priority</p>
            <h3 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{highPriorityNotes}</h3>
            <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Needs Attention</p>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notes or task details..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              All ({notes.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Pending ({pendingNotes})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === "completed"
                  ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Done ({completedNotes})
            </button>
          </div>

          {/* Priority Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">🔥 High</option>
              <option value="MEDIUM">⚡ Medium</option>
              <option value="LOW">☕ Low</option>
            </select>
          </div>

          {/* View Mode Grid/List */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader text="Loading your notes & tasks..." size="lg" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 sm:p-12 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <StickyNote className="w-8 h-8 stroke-1" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No Notes Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all" || priorityFilter !== "ALL"
              ? "No notes matched your selected filter criteria or search query."
              : "You have no notes or tasks created yet. Click 'Add New Note / Task' to create your first note!"}
          </p>
          <Button onClick={handleOpenAddModal} size="sm" className="mt-2 font-bold cursor-pointer">
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Note
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const isDone = note.isCompleted;
            const themeClass = getColorThemeClass(note.color);
            const isToggling = togglingId === note.id;
            const isDeleting = deletingId === note.id;

            return (
              <div
                key={note.id}
                className={`group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between hover:shadow-lg min-w-0 max-w-full overflow-hidden ${themeClass} ${
                  isDone ? "opacity-60 border-zinc-300 dark:border-zinc-800" : ""
                }`}
              >
                <div className="min-w-0">
                  {/* Card Header: Checkbox + Priority Badge + Controls */}
                  <div className="flex items-start justify-between gap-2.5 mb-3 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(note)}
                      disabled={isToggling}
                      className="flex items-start gap-2 cursor-pointer text-left group/check min-w-0 flex-1"
                    >
                      {isToggling ? (
                        <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin shrink-0 mt-0.5" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-400 group-hover/check:text-zinc-700 dark:group-hover/check:text-zinc-200 transition-colors shrink-0 mt-0.5" />
                      )}
                      <h4
                        className={`text-sm font-bold tracking-tight break-words [overflow-wrap:anywhere] break-all leading-tight ${
                          isDone ? "line-through text-zinc-500" : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {note.title}
                      </h4>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(
                          note.priority
                        )}`}
                      >
                        {note.priority}
                      </span>
                    </div>
                  </div>

                  {/* Content Body with strict text wrapping */}
                  {note.content && (
                    <p
                      className={`text-xs whitespace-pre-wrap leading-relaxed mb-4 break-words [overflow-wrap:anywhere] break-all overflow-hidden ${
                        isDone ? "line-through text-zinc-400" : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {note.content}
                    </p>
                  )}
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="pt-3 border-t border-zinc-900/10 dark:border-zinc-100/10 flex items-center justify-between text-[11px] text-zinc-500 gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px]">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      {formatDate(note.createdAt)}
                    </span>
                    {note.dueDate && (
                      <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 font-mono">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Due: {formatDate(note.dueDate)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(note)}
                      className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                      title="Edit Note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                      title="Delete Note"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-sm">
          {filteredNotes.map((note) => {
            const isDone = note.isCompleted;
            const isToggling = togglingId === note.id;
            const isDeleting = deletingId === note.id;

            return (
              <div
                key={note.id}
                className={`p-4 flex items-center justify-between gap-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 min-w-0 ${
                  isDone ? "opacity-60 bg-zinc-50/50 dark:bg-zinc-950/30" : ""
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(note)}
                    disabled={isToggling}
                    className="mt-0.5 cursor-pointer text-zinc-400 hover:text-zinc-600 shrink-0"
                  >
                    {isToggling ? (
                      <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-xs font-bold break-words [overflow-wrap:anywhere] break-all ${
                          isDone ? "line-through text-zinc-500" : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {note.title}
                      </h4>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${getPriorityBadgeClass(
                          note.priority
                        )}`}
                      >
                        {note.priority}
                      </span>
                    </div>
                    {note.content && (
                      <p
                        className={`text-[11px] break-words [overflow-wrap:anywhere] break-all mt-0.5 ${
                          isDone ? "line-through text-zinc-400" : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {note.content}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                    {formatDate(note.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(note)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingNote ? "Edit Note / Task" : "Create New Note / Task"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Note Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
              Title / Task Summary *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Call Supplier for Lawn Lot #45, Remind Customer Khata..."
              className="w-full p-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 font-medium"
            />
          </div>

          {/* Note Details / Content */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
              Details & Instructions
            </label>
            <textarea
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Add extra details, quantities, customer phone, fabric specifications..."
              className="w-full p-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 font-medium"
            />
          </div>

          {/* Priority & Color Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full p-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-zinc-900 cursor-pointer"
              >
                <option value="LOW">☕ Low Priority</option>
                <option value="MEDIUM">⚡ Medium Priority</option>
                <option value="HIGH">🔥 High Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full p-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-semibold focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Color Theme Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1.5">
              Card Color Accent
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => setFormData({ ...formData, color: preset.id })}
                  className={`flex-1 py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    formData.color === preset.id
                      ? "ring-2 ring-zinc-900 dark:ring-zinc-100 font-bold scale-105"
                      : "opacity-70 hover:opacity-100"
                  } ${preset.bg}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${preset.dot}`} />
                  <span className="text-[10px] capitalize">{preset.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              loadingText={editingNote ? "Updating Note..." : "Saving Note..."}
              className="font-bold"
            >
              {editingNote ? "Update Note" : "Save Note"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
