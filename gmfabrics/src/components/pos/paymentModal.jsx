"use client";

import React, { useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { useCart } from "../../context/cartContext.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { showToastSuccess, showToastError } from "../../utils/alerts.js";
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
  const [customDate, setCustomDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustCity, setNewCustCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const paidVal = parseFloat(amountPaid) || 0;
  const changeAmount = Math.max(0, paidVal - totalAmount);

  const handleConfirmSale = async () => {
    setError("");

    if (paymentMethod === "CREDIT" && !selectedCustomer && (!newCustName || !newCustName.trim())) {
      setError("Please select an existing customer or enter New Customer Name for Khata / Credit sale.");
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
        customerName: newCustName.trim() || null,
        customerPhone: newCustPhone.trim() || null,
        customerCity: newCustCity.trim() || null,
        items: items.map((i) => ({
          productId: i.product.id,
          batchId: i.batch?.id || null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discountType,
        discountValue,
        paymentMethod,
        amountPaid: paymentMethod === "CASH" ? paidVal : totalAmount,
        createdAt: customDate || null,
        notes,
      };

      const res = await api.post("/sales", payload);
      if (res.data) {
        showToastSuccess("POS Sale completed & customer registered!");
        clearCart();
        onClose();
        if (onSaleSuccess) onSaleSuccess(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to process sale.");
      showToastError(err.message || "Failed to process sale.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Transaction Payment" maxWidth="max-w-lg">
      <div className="space-y-5">
        {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

        {/* Customer Information & Quick Add */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Customer Account Details
            </span>
            {selectedCustomer ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Selected: {selectedCustomer.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsNewCustomer(!isNewCustomer)}
                className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isNewCustomer ? "Cancel New Registration" : "+ Add New Customer Details"}
              </button>
            )}
          </div>

          {selectedCustomer ? (
            <div className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
              <span>{selectedCustomer.name}</span>
              {selectedCustomer.phone && <span className="ml-2 opacity-75">({selectedCustomer.phone})</span>}
              <span className="ml-3 font-bold text-amber-600 dark:text-amber-400">
                Khata Balance: PKR {selectedCustomer.outstandingBalance || 0}
              </span>
            </div>
          ) : isNewCustomer || paymentMethod === "CREDIT" ? (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Customer Name *"
                  required={paymentMethod === "CREDIT"}
                  className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="Phone Number (e.g. 03001234567)"
                  className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={newCustCity}
                onChange={(e) => setNewCustCity(e.target.value)}
                placeholder="City / Address (Optional - e.g. Lahore / Anarkali Market)"
                className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Customer will be automatically created in database upon sale completion.
              </p>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 font-medium flex items-center justify-between">
              <span>Walk-in Customer (Standard Cash Bill)</span>
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className="text-[11px] text-emerald-600 font-bold hover:underline"
              >
                + Register Name & Phone
              </button>
            </div>
          )}
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

        {/* Custom Transaction Date */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Transaction Date & Time (Optional)
          </label>
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Leave blank to automatically apply current system date & time.
          </p>
        </div>

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
