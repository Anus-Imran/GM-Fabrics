"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { ExpenseTable } from "../../../components/expenses/expenseTable.jsx";
import { ExpenseModal } from "../../../components/expenses/expenseModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Plus } from "lucide-react";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        api.get("/expenses"),
        api.get("/expense-categories"),
      ]);
      if (expRes.data) setExpenses(expRes.data);
      if (catRes.data) setCategories(catRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (formData) => {
    try {
      await api.post("/expenses", formData);
      showToastSuccess("Expense entry recorded!");
      fetchData();
    } catch (err) {
      showToastError(err.message || "Failed to record expense.");
    }
  };

  const handleDeleteExpense = async (id) => {
    const isConfirmed = await confirmDelete("Delete Expense?", "Are you sure you want to delete this expense entry?");
    if (isConfirmed) {
      try {
        await api.delete(`/expenses/${id}`);
        showToastSuccess("Expense deleted successfully.");
        fetchData();
      } catch (err) {
        showToastError(err.message || "Failed to delete expense.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop Operating Expenses"
        description="Record and track daily shop expenses (Rent, Salaries, Utilities, Transport, Maintenance)."
        action={
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 font-bold">
            <Plus className="w-4 h-4" /> Record New Expense
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading expenses...</div>
        ) : (
          <ExpenseTable expenses={expenses} onDelete={handleDeleteExpense} />
        )}
      </Card>

      <ExpenseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateExpense}
        categories={categories}
      />
    </div>
  );
}
