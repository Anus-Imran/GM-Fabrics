"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { AlertCircle, Lock, Layers } from "lucide-react";

export const StockEntryModal = ({
  isOpen,
  onClose,
  onSubmit,
  products = [],
  suppliers = [],
  initialData = null,
}) => {
  const isEdit = Boolean(initialData && initialData.id);

  // Associated batch check
  const mainBatch = initialData?.stockBatches?.[0] || null;
  const soldQuantity = mainBatch
    ? Math.max(0, (mainBatch.initialQuantity || 0) - (mainBatch.remainingQuantity || 0))
    : 0;
  const hasSalesHistory = soldQuantity > 0 || (mainBatch?.saleItems && mainBatch.saleItems.length > 0);

  const [selectedProductId, setSelectedProductId] = useState(
    initialData?.productId ? initialData.productId.toString() : ""
  );
  const [supplierId, setSupplierId] = useState(
    initialData?.supplierId ? initialData.supplierId.toString() : ""
  );
  const [quantity, setQuantity] = useState(
    initialData?.quantity !== undefined ? initialData.quantity.toString() : ""
  );
  const [costPerUnit, setCostPerUnit] = useState(
    initialData?.costPerUnit !== undefined ? initialData.costPerUnit.toString() : ""
  );
  const [newSalePrice, setNewSalePrice] = useState(() => {
    const initialBatchPrice = mainBatch?.sellingPrice > 0 ? mainBatch.sellingPrice : null;
    const currentProdPrice = initialData?.product?.salePrice || "";
    return initialBatchPrice ? initialBatchPrice.toString() : (currentProdPrice ? currentProdPrice.toString() : "");
  });
  const [customDate, setCustomDate] = useState(() => {
    if (initialData?.purchasedAt) {
      try {
        const d = new Date(initialData.purchasedAt);
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      } catch {
        return "";
      }
    }
    return "";
  });
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const selectedProduct = products.find((p) => p.id === parseInt(selectedProductId, 10));

  const qtyVal = parseFloat(quantity) || 0;
  const costVal = parseFloat(costPerUnit) || 0;
  const totalCost = qtyVal * costVal;
  const priceDiff = selectedProduct ? costVal - (selectedProduct.costPrice || 0) : 0;
  const effectiveSalePrice = newSalePrice ? parseFloat(newSalePrice) : (selectedProduct?.salePrice || 0);

  const isLowMargin = selectedProduct && costVal > 0 && effectiveSalePrice > 0 && costVal >= effectiveSalePrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedProductId || qtyVal <= 0 || costVal < 0) {
      setError("Please select product and enter valid quantity and cost per unit.");
      return;
    }

    if (isEdit && hasSalesHistory && qtyVal < soldQuantity) {
      setError(`Cannot reduce quantity below ${soldQuantity} because ${soldQuantity} units have already been sold in POS sales.`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        productId: parseInt(selectedProductId, 10),
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        quantity: qtyVal,
        costPerUnit: costVal,
        newSalePrice: newSalePrice ? parseFloat(newSalePrice) : null,
        purchasedAt: customDate || null,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save stock purchase entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Stock Purchase Lot" : "Record Inventory Stock Purchase"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Batch Status Notice in Edit Mode */}
        {isEdit && mainBatch && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Stock Lot Batch Status (FIFO Managed)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-zinc-500 block">Initial Lot:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{mainBatch.initialQuantity} pcs</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Sold in POS:</span>
                <span className={`font-bold ${soldQuantity > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {soldQuantity} pcs
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Remaining:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{mainBatch.remainingQuantity} pcs</span>
              </div>
            </div>
            {hasSalesHistory && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 pt-1 border-t border-indigo-100 dark:border-indigo-900/60">
                Notice: Sales have already been fulfilled from this batch. Minimum allowable quantity is {soldQuantity} pcs. Fabric product is locked to preserve sales audit.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
            <span>Select Product *</span>
            {isEdit && hasSalesHistory && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                <Lock className="w-3 h-3" /> Locked (Sales Recorded)
              </span>
            )}
          </label>
          <select
            value={selectedProductId}
            disabled={isEdit && hasSalesHistory}
            onChange={(e) => {
              const pId = e.target.value;
              setSelectedProductId(pId);
              const p = products.find((prod) => prod.id === parseInt(pId, 10));
              if (p) {
                setCostPerUnit(p.costPrice.toString());
                setNewSalePrice(p.salePrice ? p.salePrice.toString() : "");
              }
            }}
            required
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
          >
            <option value="">Select Fabric Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Current Stock: {p.stockQuantity} {p.unit?.symbol || ""})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Current Catalog Cost Price:</span>
              <span className="font-bold">{formatCurrency(selectedProduct.costPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Current Retail Sale Price:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(selectedProduct.salePrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Unit of Measure:</span>
              <span className="font-semibold">{selectedProduct.unit?.name || "pcs"}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Supplier (Vendor)
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Purchased Quantity (${selectedProduct?.unit?.symbol || "units"}) *`}
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10"
            required
          />
          <Input
            label="Vendor Cost / Unit (PKR) *"
            type="number"
            step="any"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
            placeholder="2000"
            required
          />
        </div>

        <div>
          <Input
            label="Retail Selling Price (PKR - Optional)"
            type="number"
            step="any"
            value={newSalePrice}
            onChange={(e) => setNewSalePrice(e.target.value)}
            placeholder={selectedProduct?.salePrice ? selectedProduct.salePrice.toString() : "3500"}
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Updates catalog selling price and this batch lot&apos;s retail rate.
          </p>
        </div>

        {isLowMargin && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-medium space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              Zero / Negative Profit Margin Warning
            </div>
            <div>
              Vendor cost price ({formatCurrency(costVal)}) is greater than or equal to Retail Sale Price ({formatCurrency(effectiveSalePrice)}). Consider setting a higher Retail Sale Price above.
            </div>
          </div>
        )}

        {/* Calculation summary */}
        <div className="p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl space-y-2">
          <div className="flex justify-between text-xs">
            <span className="opacity-80">Total Purchase Cost:</span>
            <span className="text-base font-extrabold">{formatCurrency(totalCost)}</span>
          </div>
          {selectedProduct && costVal > 0 && (
            <div className="flex justify-between text-[11px] pt-1 border-t border-zinc-700 dark:border-zinc-300">
              <span className="opacity-80">Cost Change from Current:</span>
              <span className="font-bold">
                {priceDiff > 0 ? `+ PKR ${priceDiff} (Increased)` : priceDiff < 0 ? `- PKR ${Math.abs(priceDiff)} (Decreased)` : "No change"}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Purchase / Entry Date & Time (Optional)
          </label>
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Leave blank to automatically apply current system date & time.
          </p>
        </div>

        <Input
          label="Purchase Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Seasonal vendor price increase"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-2/3 font-bold">
            {loading
              ? isEdit ? "Updating..." : "Recording..."
              : isEdit ? "Save Changes & Sync Stock" : "Record Purchase & Update Stock"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

