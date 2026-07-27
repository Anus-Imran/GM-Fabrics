"use client";

import React, { useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { useCart } from "../../context/cartContext.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import api from "../../services/apiService.js";
import { Banknote, CreditCard, BookOpen } from "lucide-react";

export const PaymentModal = ({ isOpen, onClose, onSaleSuccess }) => {
  const {
    items,
    selectedCustomer,
    discountType,
    discountValue,
    totalAmount,
    clearCart,
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState("CASH"); // "CASH" | "CARD" | "CREDIT"
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const paidVal = parseFloat(amountPaid) || 0;
  const changeAmount = Math.max(0, paidVal - totalAmount);

  const handleConfirmSale = async () => {
    setError("");

    if (paymentMethod === "CREDIT" && !selectedCustomer) {
      setError("Please select a customer for Khata / Credit sale.");
      return;
    }

    if (paymentMethod === "CASH" && paidVal < totalAmount) {
      setError(`Amount paid (PKR ${paidVal}) is less than total amount (PKR ${totalAmount}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer?.id || null,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discountType,
        discountValue,
        paymentMethod,
        amountPaid: paymentMethod === "CASH" ? paidVal : totalAmount,
        notes,
      };

      const res = await api.post("/sales", payload);
      if (res.data) {
        clearCart();
        onClose();
        if (onSaleSuccess) onSaleSuccess(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to process sale.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Transaction Payment" maxWidth="max-w-lg">
      <div className="space-y-5">
        {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

        {/* Customer Badge */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-xs flex justify-between items-center">
          <span className="text-zinc-500">Customer Account:</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone || "No Phone"})` : "Walk-in Customer"}
          </span>
        </div>

        {/* Total Display */}
        <div className="text-center p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl">
          <span className="text-xs uppercase font-bold tracking-wider opacity-70">Total Amount Payable</span>
          <h2 className="text-3xl font-black mt-1">{formatCurrency(totalAmount)}</h2>
        </div>

        {/* Payment Methods */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                paymentMethod === "CASH"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="text-xs font-bold">CASH</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CARD")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                paymentMethod === "CARD"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-bold">CARD</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("CREDIT")}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                paymentMethod === "CREDIT"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-bold">KHATA / CREDIT</span>
            </button>
          </div>
        </div>

        {/* Cash Tendered Input */}
        {paymentMethod === "CASH" && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl space-y-3 border border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Cash Tendered (Amount Received)
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={totalAmount.toString()}
                className="w-full text-lg font-bold p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700 font-bold">
              <span>Change to Return:</span>
              <span className="text-lg text-zinc-900 dark:text-zinc-100">{formatCurrency(changeAmount)}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Transaction Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid via Easypaisa / Special request"
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSale}
            disabled={submitting}
            className="w-2/3 font-bold"
          >
            {submitting ? "Processing..." : "Confirm & Print Receipt"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
