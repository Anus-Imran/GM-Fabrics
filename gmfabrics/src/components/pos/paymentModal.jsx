"use client";

import React, { useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { useCart } from "../../context/cartContext.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { showToastSuccess, showToastError } from "../../utils/alerts.js";
import api from "../../services/apiService.js";
import { Banknote, CreditCard, BookOpen, UserCheck, UserPlus, Calendar, FileText } from "lucide-react";

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

  const [customerMode, setCustomerMode] = useState("walkin"); // "walkin" | "new"
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustCity, setNewCustCity] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const paidVal = parseFloat(amountPaid) || 0;
  const changeAmount = Math.max(0, paidVal - totalAmount);

  const handleConfirmSale = async () => {
    setError("");

    const activeCustName = customerMode === "new" ? newCustName.trim() : "";
    if (paymentMethod === "CREDIT" && !selectedCustomer && !activeCustName) {
      setError("Please select an existing customer or enter Customer Name for Khata / Credit sale.");
      return;
    }

    if (paymentMethod === "CASH" && paidVal < totalAmount) {
      setError(`Amount paid (${formatCurrency(paidVal)}) is less than total amount (${formatCurrency(totalAmount)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer?.id || null,
        customerName: activeCustName || null,
        customerPhone: customerMode === "new" ? newCustPhone.trim() || null : null,
        customerCity: customerMode === "new" ? newCustCity.trim() || null : null,
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
        showToastSuccess("POS Sale completed & receipt generated!");
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
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Transaction Payment" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column: Customer Details & Transaction Notes */}
          <div className="space-y-4">
            {/* Customer Account Selector Card */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Customer Profile
                </span>
                {selectedCustomer && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    Selected from Cart
                  </span>
                )}
              </div>

              {selectedCustomer ? (
                <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
                  <div className="font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>{selectedCustomer.name}</span>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="text-zinc-500 font-mono text-[11px]">Phone: {selectedCustomer.phone}</div>
                  )}
                  <div className="text-amber-600 dark:text-amber-400 font-bold pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                    Current Khata Balance: {formatCurrency(selectedCustomer.outstandingBalance || 0)}
                  </div>
                </div>
              ) : (
                <>
                  {/* Mode Toggle Buttons */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-200/60 dark:bg-zinc-900/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCustomerMode("walkin")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        customerMode === "walkin"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      Walk-in Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMode("new")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        customerMode === "new"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Register New</span>
                    </button>
                  </div>

                  {customerMode === "new" ? (
                    <div className="space-y-2.5 pt-1">
                      <input
                        type="text"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        placeholder="Customer Full Name *"
                        required={paymentMethod === "CREDIT"}
                        className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          placeholder="Phone (03001234567)"
                          className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
                        />
                        <input
                          type="text"
                          value={newCustCity}
                          onChange={(e) => setNewCustCity(e.target.value)}
                          placeholder="City / Location"
                          className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 font-medium">
                      Standard Walk-in Cash Sale (No customer profile attached)
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Custom Date & Time */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Transaction Date & Time (Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
              />
              <p className="text-[10px] text-zinc-400">
                Leave blank to automatically apply current system date & time.
              </p>
            </div>

            {/* Transaction Notes */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Transaction Notes (Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via online transfer / Special customer request"
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column: Amount Payable & Payment Method & Checkout */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Total Display Card */}
              <div className="text-center p-5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-2xl shadow-md space-y-1">
                <span className="text-xs uppercase font-extrabold tracking-wider opacity-70">
                  Total Amount Payable
                </span>
                <h2 className="text-4xl font-black">{formatCurrency(totalAmount)}</h2>
              </div>

              {/* Payment Methods Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === "CASH"
                        ? "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs">CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === "CARD"
                        ? "border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs">CARD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CREDIT")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === "CREDIT"
                        ? "border-amber-600 bg-amber-600 text-white font-extrabold shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-xs">KHATA</span>
                  </button>
                </div>
              </div>

              {/* Cash Tendered & Change */}
              {paymentMethod === "CASH" && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl space-y-3 border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                      Cash Tendered (Amount Received)
                    </label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={totalAmount.toString()}
                      className="w-full text-xl font-extrabold p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700 font-bold">
                    <span className="text-zinc-600 dark:text-zinc-400">Change to Return:</span>
                    <span className="text-xl text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {formatCurrency(changeAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="outline" className="w-1/3 py-3 font-bold" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSale}
                disabled={submitting}
                className="w-2/3 py-3 font-extrabold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
              >
                {submitting ? "Processing Sale..." : "Confirm & Print Receipt"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
