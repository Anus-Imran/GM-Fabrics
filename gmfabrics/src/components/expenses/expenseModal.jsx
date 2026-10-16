"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { blockInvalidNumberKeys } from "../../utils/validators.js";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const ExpenseModal = ({ isOpen, onClose, onSubmit, categories = [] }) => {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [fromDrawer, setFromDrawer] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setCategoryId(categories[0]?.id || "");
    setAmount("");
    setDate(todayKey());
    setFromDrawer(false);
    setNotes("");
    setError("");
  }, [isOpen, categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const amt = parseFloat(amount);
    if (!title.trim() || !categoryId || isNaN(amt) || amt <= 0) {
      setError("Please fill in Title, Category, and an amount greater than zero.");
      return;
    }
    if (date && date > todayKey()) {
      setError("Expense date cannot be in the future.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ title: title.trim(), categoryId, amount: amt, date: date || null, fromDrawer, notes: notes.trim() || null });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to record expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Shop Expense" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <Input
          label="Expense Title"
          value={title}
          maxLength={191}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Shop Electricity Bill / Staff Tea"
          required
          autoFocus
        />

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Category *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          >
            <option value="">Select Expense Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (PKR)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onKeyDown={blockInvalidNumberKeys}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
            required
          />
          <Input label="Expense Date" type="date" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={fromDrawer} onChange={(e) => setFromDrawer(e.target.checked)} className="w-4 h-4" />
          Paid from the counter cash drawer (subtracted in day close)
        </label>

        <Input label="Notes / Voucher Ref (Optional)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="Receipt # 48102" />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} loadingText="Recording..." className="w-2/3 font-bold">
            Record Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};
