"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Undo2, Repeat, PackageMinus } from "lucide-react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import { blockInvalidNumberKeys } from "../../utils/validators.js";
import { confirmAction } from "../../utils/alerts.js";
import api from "../../services/apiService.js";

const field = "w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100";

/**
 * Send stock back to a supplier — a permanent RETURN (credit note or refund) or a
 * REPLACEMENT (supplier will send new pieces). Stock always leaves one specific purchase lot.
 * `preset` can fix supplierId / productId / batchId (e.g. opened from a purchase row).
 */
export const SupplierReturnModal = ({ isOpen, onClose, onDone, suppliers = [], preset = null }) => {
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [type, setType] = useState("RETURN");
  const [quantity, setQuantity] = useState("");
  const [settlement, setSettlement] = useState("ADJUST");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [refundToDrawer, setRefundToDrawer] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSupplierId(preset?.supplierId ? String(preset.supplierId) : "");
    setProductId(preset?.productId ? String(preset.productId) : "");
    setBatchId(preset?.batchId ? String(preset.batchId) : "");
    setType("RETURN");
    setQuantity("");
    setSettlement("ADJUST");
    setRefundMethod("CASH");
    setRefundToDrawer(false);
    setReason("");
    setNotes("");
    setError("");
  }, [isOpen, preset]);

  // Lots of the chosen supplier that still have stock.
  useEffect(() => {
    if (!isOpen || !supplierId) {
      setLots([]);
      return;
    }
    setLoadingLots(true);
    api
      .get("/supplier-returns/lots", { params: { supplierId } })
      .then((r) => setLots(r.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLots(false));
  }, [isOpen, supplierId]);

  const products = useMemo(() => {
    const map = new Map();
    for (const l of lots) {
      const p = map.get(l.productId) || { id: l.productId, name: l.productName, unit: l.unit, available: 0 };
      p.available += l.remainingQuantity;
      map.set(l.productId, p);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [lots]);

  const productLots = lots.filter((l) => String(l.productId) === String(productId));
  // Default lot: the one with the most stock left (server uses the same rule).
  const lot = productLots.find((l) => String(l.batchId) === String(batchId)) || productLots[0] || null;
  const unit = lot?.unit?.symbol || "";
  const q = parseFloat(quantity) || 0;
  const value = lot ? Math.round(q * lot.costPrice * 100) / 100 : 0;
  const supplier = suppliers.find((s) => String(s.id) === String(supplierId));

  const effectText =
    type === "REPLACEMENT"
      ? "Supplier balance does not change — it will wait for the replacement pieces."
      : settlement === "ADJUST"
      ? `Amount you owe ${supplier?.name || "the supplier"} goes down by ${formatCurrency(value)}.`
      : `Supplier pays you ${formatCurrency(value)} (${refundMethod.toLowerCase()})${refundToDrawer ? " into the cash drawer" : ""}.`;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!supplierId) return setError("Choose a supplier.");
    if (!productId || !lot) return setError("Choose a product with stock from this supplier.");
    if (!(q > 0)) return setError("Enter a quantity greater than zero.");
    if (lot.unit?.allowDecimal === false && !Number.isInteger(q)) return setError(`${lot.unit.name} must be a whole number.`);
    if (q > lot.remainingQuantity) return setError(`Only ${lot.remainingQuantity} ${unit} of this lot is in stock.`);

    // Final check with the user before stock and balances change.
    const ok = await confirmAction(
      type === "REPLACEMENT" ? "Send for replacement?" : "Return to supplier?",
      `${q} ${unit} of ${lot.productName} (lot #${lot.batchId} @ ${formatCurrency(lot.costPrice)}). Stock goes from ${lot.remainingQuantity} to ${
        Math.round((lot.remainingQuantity - q) * 1000) / 1000
      } ${unit} in this lot. ${effectText}`,
      "Yes, confirm"
    );
    if (!ok) return;

    setSaving(true);
    try {
      await api.post("/supplier-returns", {
        supplierId,
        productId,
        batchId: lot.batchId,
        type,
        quantity: q,
        settlement,
        refundMethod,
        refundToDrawer,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
      });
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const typeButton = (value, Icon, label, hint) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={`p-3 border-2 text-left cursor-pointer ${
        type === value ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs font-bold">
        <Icon className="w-4 h-4" /> {label}
      </span>
      <span className="block text-[10px] opacity-70 mt-0.5">{hint}</span>
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Stock to Supplier" icon={PackageMinus} maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

        <div className="grid grid-cols-2 gap-2">
          {typeButton("RETURN", Undo2, "Return (wapsi)", "Goods go back for good")}
          {typeButton("REPLACEMENT", Repeat, "Replacement", "Supplier will send new pieces")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setProductId("");
                setBatchId("");
              }}
              disabled={!!preset?.supplierId}
              className={field}
            >
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Product *</label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setBatchId("");
              }}
              disabled={!supplierId || !!preset?.productId}
              className={field}
            >
              <option value="">{loadingLots ? "Loading…" : products.length ? "Select product…" : "No stock from this supplier"}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {Math.round(p.available * 1000) / 1000} {p.unit?.symbol} available
                </option>
              ))}
            </select>
          </div>
        </div>

        {productLots.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Purchase lot</label>
            <select value={lot?.batchId || ""} onChange={(e) => setBatchId(e.target.value)} className={field}>
              {productLots.map((l) => (
                <option key={l.batchId} value={l.batchId}>
                  Lot #{l.batchId} • {formatDate(l.purchasedAt)}
                  {l.invoiceNumber ? ` • Inv ${l.invoiceNumber}` : ""}
                  {l.isOpeningStock ? " • opening stock" : ""} • {l.remainingQuantity} {l.unit?.symbol} left @ {formatCurrency(l.costPrice)}
                </option>
              ))}
            </select>
            {lot && lot.returnedQuantity > 0 && (
              <p className="text-[11px] text-zinc-500 mt-1">
                Already returned from this lot: {lot.returnedQuantity} {unit}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Quantity${unit ? ` (${unit})` : ""}`}
            type="number"
            inputMode="decimal"
            min="0"
            max={lot?.remainingQuantity}
            step={lot?.unit?.allowDecimal === false ? "1" : "any"}
            value={quantity}
            onKeyDown={blockInvalidNumberKeys}
            onChange={(e) => setQuantity(e.target.value)}
            error={lot && q > lot.remainingQuantity ? `Max ${lot.remainingQuantity}` : null}
            required
          />
          <div className="text-xs pt-6">
            <p className="text-zinc-500">Value at lot cost</p>
            <p className="text-lg font-black text-zinc-900 dark:text-white">{formatCurrency(value)}</p>
          </div>
        </div>

        {type === "RETURN" && (
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">How is it settled?</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["ADJUST", "Reduce supplier balance", "Credit note"],
                ["REFUND", "Supplier pays money back", "Cash / bank refund"],
              ].map(([v, label, hint]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSettlement(v)}
                  className={`p-2 border-2 text-left cursor-pointer ${
                    settlement === v ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <span className="font-bold block">{label}</span>
                  <span className="text-[10px] opacity-75">{hint}</span>
                </button>
              ))}
            </div>
            {settlement === "REFUND" && (
              <div className="grid grid-cols-2 gap-2 items-center">
                <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className={field}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={refundToDrawer} onChange={(e) => setRefundToDrawer(e.target.checked)} /> Put into cash drawer
                </label>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Colour faded / wrong design" />
          <Input label="Notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        {lot && q > 0 && q <= lot.remainingQuantity && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
            <p>
              <b>Stock:</b> {lot.productName} lot #{lot.batchId}: {lot.remainingQuantity} → {Math.round((lot.remainingQuantity - q) * 1000) / 1000} {unit}
            </p>
            <p>
              <b>Supplier:</b> {effectText}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="w-2/3 font-bold">
            {type === "REPLACEMENT" ? "Send for Replacement" : "Return to Supplier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
