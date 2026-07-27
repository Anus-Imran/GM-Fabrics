"use client";

import React, { useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";

export const ExpenseModal = ({ isOpen, onClose, onSubmit, categories = [] }) => {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const amt = parseFloat(amount);
    if (!title || !categoryId || isNaN(amt) || amt <= 0) {
      setError("Please fill in Title, Category, and valid Amount.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ title, categoryId, amount: amt, date, notes });
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
        {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <Input
          label="Expense Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Shop Electricity Bill / Staff Tea & Refreshment"
          required
        />

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Category *
          </label>
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
            label="Amount (PKR) *"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
            required
          />
          <Input
            label="Expense Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <Input
          label="Notes / Voucher Ref (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Receipt # 48102"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-2/3 font-bold">
            {loading ? "Recording..." : "Record Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
