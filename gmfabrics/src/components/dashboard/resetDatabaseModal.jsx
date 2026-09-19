"use client";

import React, { useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { AlertOctagon, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { showToastSuccess, showToastError } from "../../utils/alerts.js";
import api from "../../services/apiService.js";

export const ResetDatabaseModal = ({ isOpen, onClose, onSuccess }) => {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const CONFIRM_PHRASE = "DELETE ALL DATA";

  const isMatched = confirmationInput.trim() === CONFIRM_PHRASE;

  const handleReset = async (e) => {
    e.preventDefault();
    if (!isMatched) return;

    setLoading(true);
    try {
      const res = await api.delete("/backup/reset-database");
      showToastSuccess(res?.message || "All database data has been completely erased.");
      setConfirmationInput("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Wipe database error:", err);
      showToastError(err.message || "Failed to wipe database.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmationInput("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Dangerous Action: Factory Reset Database"
      icon={AlertOctagon}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleReset} className="space-y-4">
        {/* Warning Banner */}
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>Permanent Irreversible Action</span>
          </div>
          <p className="leading-relaxed">
            This action will permanently purge all operational store records from the PostgreSQL database:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
            <li>All Sales History, Bills, and Receipts</li>
            <li>All Products, SKUs, and Batch Lots</li>
            <li>All Stock Purchases and Supplier Records</li>
            <li>All Customer Khata Accounts & Balances</li>
            <li>All Store Expenses, Daily Notes, and Notifications</li>
          </ul>
        </div>

        {/* Safety Note */}
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Your Administrator login credentials and standard measurement units will be preserved.</span>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
            To confirm, please type <span className="font-mono text-red-600 dark:text-red-400 select-all">{CONFIRM_PHRASE}</span> below:
          </label>
          <input
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="Type DELETE ALL DATA to unlock"
            disabled={loading}
            className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isMatched || loading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? "Wiping Database..." : "Permanently Wipe Everything"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
