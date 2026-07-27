"use client";

import React, { useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";

export const KhataSettleModal = ({ isOpen, onClose, onSettle, customer }) => {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!customer) return null;

  const payVal = parseFloat(amount) || 0;
  const remainingBalance = Math.max(0, customer.outstandingBalance - payVal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (payVal <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    setLoading(true);
    try {
      await onSettle(customer.id, { amount: payVal, notes });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Settle Khata — ${customer.name}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <div className="p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl space-y-2">
          <div className="flex justify-between text-xs">
            <span className="opacity-80">Current Khata Balance Owed:</span>
            <span className="font-extrabold text-base">{formatCurrency(customer.outstandingBalance)}</span>
          </div>
          {payVal > 0 && (
            <div className="flex justify-between text-xs pt-2 border-t border-zinc-800 dark:border-zinc-200">
              <span className="opacity-80">Remaining Balance After Payment:</span>
              <span className="font-bold">{formatCurrency(remainingBalance)}</span>
            </div>
          )}
        </div>

        <Input
          label="Cash Payment Amount (PKR) *"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={customer.outstandingBalance.toString()}
          required
        />

        <Input
          label="Payment Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Cash received at counter"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-2/3 font-bold">
            {loading ? "Recording..." : "Confirm Khata Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
