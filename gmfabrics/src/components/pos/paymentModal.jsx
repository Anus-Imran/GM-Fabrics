"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { Kbd, Tooltip } from "../common/tooltip.jsx";
import { useCart } from "../../context/cartContext.jsx";
import { useAuth } from "../../context/authContext.jsx";
import { useHotkeys } from "../../hooks/useHotkeys.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { showToastSuccess, showToastError } from "../../utils/alerts.js";
import api from "../../services/apiService.js";
import { Banknote, CreditCard, BookOpen, UserCheck, UserPlus, Calendar, FileText, Printer } from "lucide-react";

const PHONE_RE = /^(\+92|0092|92|0)?3\d{2}[\s-]?\d{7}$|^0\d{2,3}[\s-]?\d{6,8}$/;
const AUTO_PRINT_KEY = "gm_auto_print";

const quickAmounts = (total) => {
  const notes = [500, 1000, 5000];
  const rounded = [100, 500, 1000].map((step) => Math.ceil(total / step) * step);
  return [...new Set([...rounded, ...notes.filter((n) => n > total)])].filter((n) => n > total).sort((a, b) => a - b).slice(0, 4);
};

const MethodButton = ({ active, onClick, icon: Icon, label, shortcut, activeClass }) => (
  <Tooltip label={`Pay by ${label.toLowerCase()}`} shortcut={shortcut} block className="w-full">
    <button
      type="button"
      onClick={onClick}
      aria-keyshortcuts={shortcut}
      className={`w-full p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
        active
          ? activeClass
          : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
      <Kbd combo={shortcut} className="opacity-70" />
    </button>
  </Tooltip>
);

export const PaymentModal = ({ isOpen, onClose, onSaleSuccess }) => {
  const { items, selectedCustomer, discountType, discountValue, totalAmount, notes: cartNotes, buildSaleItems, clearCart } = useCart();
  const { isAdmin } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [notes, setNotes] = useState("");
  const [customerMode, setCustomerMode] = useState("walkin");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustCity, setNewCustCity] = useState("");
  const [autoPrint, setAutoPrint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const cashInputRef = useRef(null);

  // Fresh form each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setPaymentMethod("CASH");
    setAmountPaid("");
    setAdvancePaid("");
    setCustomDate("");
    setNotes(cartNotes || "");
    setCustomerMode("walkin");
    setNewCustName("");
    setNewCustPhone("");
    setNewCustCity("");
    setError("");
    try {
      setAutoPrint(localStorage.getItem(AUTO_PRINT_KEY) === "1");
    } catch {
      // ignore
    }
    setTimeout(() => cashInputRef.current?.focus(), 50);
  }, [isOpen, cartNotes]);

  const paidVal = amountPaid === "" ? totalAmount : parseFloat(amountPaid) || 0;
  const changeAmount = Math.max(0, paidVal - totalAmount);
  const advanceVal = parseFloat(advancePaid) || 0;
  const khataAmount = Math.max(0, totalAmount - advanceVal);

  const toggleAutoPrint = (v) => {
    setAutoPrint(v);
    try {
      localStorage.setItem(AUTO_PRINT_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const handleConfirmSale = async () => {
    if (submitting || items.length === 0) return;
    setError("");

    const activeCustName = customerMode === "new" ? newCustName.trim() : "";
    if (paymentMethod === "CREDIT" && !selectedCustomer && !activeCustName) {
      setError("Select a customer in the cart or register a new one for a Khata (credit) sale.");
      return;
    }
    if (customerMode === "new" && !selectedCustomer && !activeCustName && (newCustPhone || newCustCity)) {
      setError("Enter the customer's name to register them.");
      return;
    }
    if (customerMode === "new" && newCustPhone.trim() && !PHONE_RE.test(newCustPhone.trim())) {
      setError("Phone must be a valid Pakistani number, e.g. 03001234567.");
      return;
    }
    if (paymentMethod === "CASH" && paidVal + 0.001 < totalAmount) {
      setError(`Cash received (${formatCurrency(paidVal)}) is less than the total (${formatCurrency(totalAmount)}).`);
      return;
    }
    if (paymentMethod === "CREDIT" && advanceVal > totalAmount) {
      setError("Advance cannot be more than the bill total.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer?.id || null,
        customerName: !selectedCustomer && activeCustName ? activeCustName : null,
        customerPhone: !selectedCustomer && customerMode === "new" ? newCustPhone.trim() || null : null,
        customerCity: !selectedCustomer && customerMode === "new" ? newCustCity.trim() || null : null,
        items: buildSaleItems(),
        discountType: parseFloat(discountValue) > 0 ? discountType || "PERCENTAGE" : null,
        discountValue: parseFloat(discountValue) || 0,
        paymentMethod,
        amountPaid: paymentMethod === "CASH" ? paidVal : paymentMethod === "CREDIT" ? advanceVal : totalAmount,
        createdAt: isAdmin && customDate ? customDate : null,
        notes: notes.trim() || null,
      };

      const res = await api.post("/sales", payload);
      if (res.data) {
        showToastSuccess(`Sale ${res.data.saleNumber} completed`);
        clearCart();
        onClose();
        onSaleSuccess?.(res.data, { autoPrint });
      }
    } catch (err) {
      setError(err.message || "Failed to process sale.");
      showToastError(err.message || "Failed to process sale.");
    } finally {
      setSubmitting(false);
    }
  };

  useHotkeys(
    {
      "Alt+1": () => setPaymentMethod("CASH"),
      "Alt+2": () => setPaymentMethod("CARD"),
      "Alt+3": () => setPaymentMethod("CREDIT"),
      "Alt+X": () => {
        setPaymentMethod("CASH");
        setAmountPaid(String(totalAmount));
      },
      "Ctrl+Enter": handleConfirmSale,
      F4: handleConfirmSale,
    },
    { enabled: isOpen }
  );

  return (
    <Modal isOpen={isOpen} onClose={submitting ? () => {} : onClose} title="Complete Transaction Payment" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {error && (
          <div role="alert" className="p-3 text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column: Customer Details & Transaction Notes */}
          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Customer Profile</span>
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
                  {selectedCustomer.phone && <div className="text-zinc-500 font-mono text-[11px]">Phone: {selectedCustomer.phone}</div>}
                  <div className="text-amber-600 dark:text-amber-400 font-bold pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                    Current Khata Balance: {formatCurrency(selectedCustomer.outstandingBalance || 0)}
                  </div>
                </div>
              ) : (
                <>
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
                        maxLength={150}
                        className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="tel"
                          inputMode="tel"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value.replace(/[^\d+\-\s]/g, ""))}
                          placeholder="Phone (03001234567)"
                          maxLength={16}
                          className={`w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none ${
                            newCustPhone && !PHONE_RE.test(newCustPhone.trim()) ? "border-red-400" : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        />
                        <input
                          type="text"
                          value={newCustCity}
                          onChange={(e) => setNewCustCity(e.target.value)}
                          placeholder="City / Location"
                          maxLength={100}
                          className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400">An existing customer with the same phone is reused automatically.</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 font-medium">
                      Standard walk-in sale (no customer profile attached)
                    </div>
                  )}
                </>
              )}
            </div>

            {isAdmin && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Backdate Sale (Admin, optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={customDate}
                  max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
                />
                <p className="text-[10px] text-zinc-400">Leave blank for the current time. Backdated sales are recorded in the audit log.</p>
              </div>
            )}

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Transaction Notes (Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via online transfer / Special customer request"
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column: Amount Payable & Payment Method & Checkout */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-center p-5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-2xl shadow-md space-y-1">
                <span className="text-xs uppercase font-extrabold tracking-wider opacity-70">Total Amount Payable</span>
                <h2 className="text-4xl font-black">{formatCurrency(totalAmount)}</h2>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <MethodButton
                    active={paymentMethod === "CASH"}
                    onClick={() => setPaymentMethod("CASH")}
                    icon={Banknote}
                    label="CASH"
                    shortcut="Alt+1"
                    activeClass="border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm"
                  />
                  <MethodButton
                    active={paymentMethod === "CARD"}
                    onClick={() => setPaymentMethod("CARD")}
                    icon={CreditCard}
                    label="CARD"
                    shortcut="Alt+2"
                    activeClass="border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold shadow-sm"
                  />
                  <MethodButton
                    active={paymentMethod === "CREDIT"}
                    onClick={() => setPaymentMethod("CREDIT")}
                    icon={BookOpen}
                    label="KHATA"
                    shortcut="Alt+3"
                    activeClass="border-amber-600 bg-amber-600 text-white font-extrabold shadow-sm"
                  />
                </div>
              </div>

              {paymentMethod === "CASH" && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl space-y-3 border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">Cash Tendered (Amount Received)</label>
                    <input
                      ref={cashInputRef}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleConfirmSale()}
                      placeholder={`${totalAmount} (exact)`}
                      className="w-full text-xl font-extrabold p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Tooltip label="Exact amount" shortcut="Alt+X">
                        <button
                          type="button"
                          onClick={() => setAmountPaid(String(totalAmount))}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
                        >
                          Exact
                        </button>
                      </Tooltip>
                      {quickAmounts(totalAmount).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmountPaid(String(amt))}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          {amt.toLocaleString("en-PK")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700 font-bold">
                    <span className="text-zinc-600 dark:text-zinc-400">Change to Return:</span>
                    <span className="text-xl text-emerald-600 dark:text-emerald-400 font-extrabold">{formatCurrency(changeAmount)}</span>
                  </div>
                </div>
              )}

              {paymentMethod === "CREDIT" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl space-y-3 border border-amber-200 dark:border-amber-900">
                  <div>
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1">Advance paid now (optional)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={totalAmount}
                      step="any"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(e.target.value)}
                      placeholder="0"
                      className="w-full text-lg font-extrabold p-2.5 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-zinc-600 dark:text-zinc-400">Added to Khata:</span>
                    <span className="text-xl text-amber-600 font-extrabold">{formatCurrency(khataAmount)}</span>
                  </div>
                </div>
              )}

              {paymentMethod === "CARD" && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 font-semibold">
                  Charge {formatCurrency(totalAmount)} on the card machine, then confirm.
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
              <input type="checkbox" checked={autoPrint} onChange={(e) => toggleAutoPrint(e.target.checked)} className="w-4 h-4" />
              <Printer className="w-3.5 h-3.5" />
              Print receipt automatically after sale
            </label>

            <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="outline" className="w-1/3 py-3 font-bold" onClick={onClose} disabled={submitting} shortcut="Escape" tooltip="Back to cart">
                Cancel
              </Button>
              <div className="w-2/3">
                <Button
                  onClick={handleConfirmSale}
                  loading={submitting}
                  loadingText="Processing Sale..."
                  variant="success"
                  className="w-full py-3 font-extrabold text-sm shadow-lg"
                  tooltip="Confirm sale"
                  shortcut="Ctrl+Enter"
                >
                  Confirm Sale ({formatCurrency(totalAmount)})
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
