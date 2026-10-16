"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { blockInvalidNumberKeys } from "../../utils/validators.js";

export const KhataSettleModal = ({ isOpen, onClose, onSettle, customer }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setMethod("CASH");
      setNotes("");
      setError("");
    }
  }, [isOpen]);

  if (!customer) return null;

  const balance = customer.outstandingBalance || 0;
  const payVal = parseFloat(amount) || 0;
  const remainingBalance = Math.max(0, balance - payVal);
  const tooMuch = payVal > balance + 0.004;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (payVal <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }
    if (tooMuch) {
      setError(`Payment cannot be more than the balance (${formatCurrency(balance)}).`);
      return;
    }

    setLoading(true);
    try {
      await onSettle(customer.id, { amount: payVal, method, notes: notes.trim() || null });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receive Khata Payment — ${customer.name}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <div className="p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl space-y-2">
          <div className="flex justify-between text-xs">
            <span className="opacity-80">Current Khata Balance Owed:</span>
            <span className="font-extrabold text-base">{formatCurrency(balance)}</span>
          </div>
          {payVal > 0 && (
            <div className="flex justify-between text-xs pt-2 border-t border-zinc-800 dark:border-zinc-200">
              <span className="opacity-80">Remaining After Payment:</span>
              <span className="font-bold">{formatCurrency(remainingBalance)}</span>
            </div>
          )}
        </div>

        <div>
          <Input
            label="Payment Amount (PKR)"
            type="number"
            inputMode="decimal"
            min="0"
            max={balance}
            step="0.01"
            value={amount}
            onKeyDown={blockInvalidNumberKeys}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(balance)}
            error={tooMuch ? "More than the outstanding balance" : null}
            required
            autoFocus
          />
          <button type="button" onClick={() => setAmount(String(balance))} className="text-[11px] font-bold text-zinc-500 underline mt-1 cursor-pointer">
            Full balance
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Received by:</span>
          {["CASH", "CARD"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`px-3 py-1 rounded-lg font-bold border cursor-pointer ${
                method === m
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {m === "CARD" ? "Card / Bank" : "Cash"}
            </button>
          ))}
        </div>

        <Input
          label="Payment Notes (Optional)"
          value={notes}
          maxLength={500}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Received at counter / JazzCash ref"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} loadingText="Recording..." className="w-2/3 font-bold" disabled={tooMuch}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
