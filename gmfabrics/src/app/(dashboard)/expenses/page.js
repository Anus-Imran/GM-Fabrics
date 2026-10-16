"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { ExpenseTable } from "../../../components/expenses/expenseTable.jsx";
import { ExpenseModal } from "../../../components/expenses/expenseModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Plus } from "lucide-react";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import api from "../../../services/apiService.js";
import { useServerList } from "../../../hooks/useServerList.js";
import { useHotkeys } from "../../../hooks/useHotkeys.js";
import { useAuth } from "../../../context/authContext.jsx";

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const [categoryId, setCategoryId] = useState("");
  const list = useServerList("/expenses", { params: { categoryId } });
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get("/expense-categories").then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  useHotkeys({ "Alt+Shift+N": () => setShowModal(true) }, { enabled: !showModal });

  // Re-thrown so the modal keeps the form and shows the error.
  const handleCreateExpense = async (formData) => {
    await api.post("/expenses", formData);
    showToastSuccess("Expense entry recorded!");
    list.reload();
  };

  const handleDeleteExpense = async (expense) => {
    if (!(await confirmDelete("Delete Expense?", `${expense.title} — ${formatCurrency(expense.amount)}`))) return;
    try {
      await api.delete(`/expenses/${expense.id}`);
      showToastSuccess("Expense deleted.");
      list.reload();
    } catch (err) {
      showToastError(err.message || "Failed to delete expense.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop Operating Expenses"
        description="Record and track daily shop expenses (Rent, Salaries, Utilities, Transport, Maintenance)."
        action={
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 font-bold" tooltip="Record expense" shortcut="Alt+Shift+N">
            <Plus className="w-4 h-4" /> Record New Expense
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Total in view</p>
          <p className="text-xl font-black text-rose-600">{formatCurrency(list.summary?.totalAmount || 0)}</p>
          <p className="text-[10px] text-zinc-400">{list.total} entries</p>
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {list.error && <p className="text-xs text-red-600 mb-3">{list.error}</p>}
        <ExpenseTable list={list} onDelete={handleDeleteExpense} isAdmin={isAdmin} />
      </Card>

      <ExpenseModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreateExpense} categories={categories} />
    </div>
  );
}
