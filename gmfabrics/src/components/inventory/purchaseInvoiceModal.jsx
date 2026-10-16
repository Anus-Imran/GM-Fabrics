"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { blockInvalidNumberKeys } from "../../utils/validators.js";
import { useHotkeys } from "../../hooks/useHotkeys.js";

const emptyLine = () => ({ key: Math.random().toString(36).slice(2), productId: "", quantity: "", costPerUnit: "", newSalePrice: "" });
const field = "w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100";

/** One supplier invoice with many products, plus an optional payment against it. */
export const PurchaseInvoiceModal = ({ isOpen, onClose, onSubmit, products = [], suppliers = [] }) => {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [fromDrawer, setFromDrawer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSupplierId("");
    setInvoiceNumber("");
    setPurchasedAt("");
    setNotes("");
    setLines([emptyLine()]);
    setAmountPaid("");
    setPaymentMethod("CASH");
    setFromDrawer(false);
    setError("");
  }, [isOpen]);

  const productMap = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);

  const updateLine = (key, patch) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        // Pre-fill last cost when a product is picked.
        if (patch.productId && !l.costPerUnit) {
          const p = productMap.get(String(patch.productId));
          if (p?.costPrice) next.costPerUnit = String(p.costPrice);
        }
        return next;
      })
    );

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  useHotkeys({ "Alt+A": addLine }, { enabled: isOpen });

  const total = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.costPerUnit) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const filled = lines.filter((l) => l.productId || l.quantity || l.costPerUnit);
    if (filled.length === 0) return setError("Add at least one product line.");
    for (const [i, l] of filled.entries()) {
      const p = productMap.get(String(l.productId));
      const q = parseFloat(l.quantity);
      const c = parseFloat(l.costPerUnit);
      if (!p) return setError(`Line ${i + 1}: choose a product.`);
      if (!(q > 0)) return setError(`Line ${i + 1}: quantity must be greater than zero.`);
      if (p.unit?.allowDecimal === false && !Number.isInteger(q)) return setError(`Line ${i + 1}: ${p.unit.name} must be a whole number.`);
      if (isNaN(c) || c < 0) return setError(`Line ${i + 1}: enter a valid cost.`);
    }
    const ids = filled.map((l) => String(l.productId));
    if (new Set(ids).size !== ids.length) return setError("The same product appears twice — combine the quantities into one line.");
    const paid = parseFloat(amountPaid) || 0;
    if (paid > 0 && !supplierId) return setError("Choose a supplier to record a payment.");
    if (paid > total + 0.01) return setError("Payment is more than the invoice total.");

    setLoading(true);
    try {
      await onSubmit({
        supplierId: supplierId || null,
        invoiceNumber: invoiceNumber.trim() || null,
        purchasedAt: purchasedAt || null,
        notes: notes.trim() || null,
        amountPaid: paid || undefined,
        paymentMethod,
        fromDrawer,
        items: filled.map((l) => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity),
          costPerUnit: parseFloat(l.costPerUnit),
          newSalePrice: l.newSalePrice ? parseFloat(l.newSalePrice) : undefined,
        })),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save purchase invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Purchase Invoice" icon={FileText} maxWidth="max-w-4xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Supplier</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={field}>
              <option value="">No supplier / direct</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.balanceDue > 0 ? ` (due ${s.balanceDue.toLocaleString("en-PK")})` : ""}
                </option>
              ))}
            </select>
          </div>
          <Input label="Invoice / Bill No." value={invoiceNumber} maxLength={64} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-4521" />
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Purchase date</label>
            <input type="datetime-local" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} className={field} />
          </div>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500">
              <tr>
                <th className="p-2 text-left w-[38%]">Product</th>
                <th className="p-2 text-left">Qty</th>
                <th className="p-2 text-left">Cost / unit</th>
                <th className="p-2 text-left">New sale price</th>
                <th className="p-2 text-right">Line total</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {lines.map((l) => {
                const p = productMap.get(String(l.productId));
                const lineTotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.costPerUnit) || 0);
                return (
                  <tr key={l.key}>
                    <td className="p-2">
                      <select value={l.productId} onChange={(e) => updateLine(l.key, { productId: e.target.value })} className={field}>
                        <option value="">Select product…</option>
                        {products.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} {prod.sku ? `(${prod.sku})` : ""}
                          </option>
                        ))}
                      </select>
                      {p && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Stock {p.stockQuantity} {p.unit?.symbol} • last cost {formatCurrency(p.costPrice || 0)} • sale {formatCurrency(p.salePrice)}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step={p?.unit?.allowDecimal === false ? "1" : "any"}
                        value={l.quantity}
                        onKeyDown={blockInvalidNumberKeys}
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                        className={field}
                        placeholder={p?.unit?.symbol || "qty"}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.costPerUnit}
                        onKeyDown={blockInvalidNumberKeys}
                        onChange={(e) => updateLine(l.key, { costPerUnit: e.target.value })}
                        className={field}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.newSalePrice}
                        onKeyDown={blockInvalidNumberKeys}
                        onChange={(e) => updateLine(l.key, { newSalePrice: e.target.value })}
                        className={field}
                        placeholder="keep"
                      />
                    </td>
                    <td className="p-2 text-right font-bold">{formatCurrency(lineTotal)}</td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== l.key) : prev))}
                        className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={addLine} tooltip="Add product line" shortcut="Alt+A">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add line
          </Button>
          <p className="text-sm font-black">Invoice total: {formatCurrency(total)}</p>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Input
            label="Paid to supplier now"
            type="number"
            min="0"
            step="any"
            value={amountPaid}
            onKeyDown={blockInvalidNumberKeys}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="0 (on credit)"
          />
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={field}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs pb-2 cursor-pointer">
            <input type="checkbox" checked={fromDrawer} onChange={(e) => setFromDrawer(e.target.checked)} /> Paid from cash drawer
          </label>
          <p className="text-xs pb-2 text-zinc-500">
            Balance on credit: <span className="font-bold text-amber-600">{formatCurrency(Math.max(0, total - (parseFloat(amountPaid) || 0)))}</span>
          </p>
        </div>

        <Input label="Notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />

        <div className="flex gap-3">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} loadingText="Saving invoice..." className="w-2/3 font-bold">
            Save Invoice & Add Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
};
