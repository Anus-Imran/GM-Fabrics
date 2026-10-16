"use client";

import React, { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { blockInvalidNumberKeys } from "../../utils/validators.js";
import api from "../../services/apiService.js";
import { showToastSuccess } from "../../utils/alerts.js";

const REASONS = [
  { value: "DAMAGE", label: "Damaged (remove)", sign: -1 },
  { value: "SHRINKAGE", label: "Shrinkage / cutting loss (remove)", sign: -1 },
  { value: "COUNT_CORRECTION", label: "Stock count correction", sign: 0 },
  { value: "FOUND", label: "Found stock (add)", sign: 1 },
  { value: "OPENING", label: "Opening stock (add)", sign: 1 },
  { value: "OTHER", label: "Other", sign: 0 },
];

/** Records a reasoned stock change for one product (admin). */
export const StockAdjustModal = ({ isOpen, onClose, product, onDone }) => {
  const [reason, setReason] = useState("DAMAGE");
  const [direction, setDirection] = useState(-1);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("DAMAGE");
      setDirection(-1);
      setQty("");
      setCost("");
      setNotes("");
      setError("");
    }
  }, [isOpen]);

  if (!product) return null;
  const unit = product.unit?.symbol || "";
  const fixedSign = REASONS.find((r) => r.value === reason)?.sign || 0;
  const sign = fixedSign || direction;
  const q = parseFloat(qty) || 0;
  const after = Math.round((product.stockQuantity + sign * q) * 1000) / 1000;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (q <= 0) return setError("Enter a quantity greater than zero.");
    if (product.unit?.allowDecimal === false && !Number.isInteger(q)) return setError(`${product.unit.name} must be a whole number.`);
    if (after < 0) return setError(`Only ${product.stockQuantity} ${unit} in stock.`);
    setLoading(true);
    try {
      await api.post("/stock-adjustments", {
        productId: product.id,
        quantity: sign * q,
        reason,
        notes: notes.trim() || null,
        ...(sign > 0 && cost !== "" ? { costPrice: parseFloat(cost) } : {}),
      });
      showToastSuccess(`Stock adjusted: ${product.name} is now ${after} ${unit}`);
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Adjust Stock — ${product.name}`} icon={ClipboardList} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
        <div className="text-xs text-zinc-500">
          Current stock: <span className="font-bold text-zinc-900 dark:text-zinc-100">{product.stockQuantity} {unit}</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {!fixedSign && (
          <div className="flex gap-2 text-xs">
            {[
              [-1, "Remove stock"],
              [1, "Add stock"],
            ].map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => setDirection(s)}
                className={`flex-1 py-2 rounded-lg font-bold border cursor-pointer ${
                  direction === s ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Quantity (${unit})`}
            type="number"
            inputMode="decimal"
            min="0"
            step={product.unit?.allowDecimal === false ? "1" : "any"}
            value={qty}
            onKeyDown={blockInvalidNumberKeys}
            onChange={(e) => setQty(e.target.value)}
            required
            autoFocus
          />
          {sign > 0 && product.costPrice !== undefined && (
            <Input
              label="Cost per unit (optional)"
              type="number"
              min="0"
              step="any"
              value={cost}
              onKeyDown={blockInvalidNumberKeys}
              onChange={(e) => setCost(e.target.value)}
              placeholder={String(product.costPrice ?? "")}
            />
          )}
        </div>

        <Input label="Notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Water damage in storage" />

        {q > 0 && (
          <p className={`text-xs font-bold ${after < 0 ? "text-red-600" : "text-zinc-700 dark:text-zinc-300"}`}>
            Stock after adjustment: {after} {unit}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="w-2/3 font-bold">
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
