"use client";

import React, { useState } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";

export const StockEntryModal = ({ isOpen, onClose, onSubmit, products = [], suppliers = [] }) => {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = products.find((p) => p.id === parseInt(selectedProductId, 10));

  const qtyVal = parseFloat(quantity) || 0;
  const costVal = parseFloat(costPerUnit) || 0;
  const totalCost = qtyVal * costVal;
  const priceDiff = selectedProduct ? costVal - selectedProduct.costPrice : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedProductId || qtyVal <= 0 || costVal < 0) {
      setError("Please select product and enter valid quantity and cost per unit.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        productId: selectedProductId,
        supplierId: supplierId || null,
        quantity: qtyVal,
        costPerUnit: costVal,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to record stock purchase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Inventory Stock Purchase" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Select Product *
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => {
              const pId = e.target.value;
              setSelectedProductId(pId);
              const p = products.find((prod) => prod.id === parseInt(pId, 10));
              if (p) setCostPerUnit(p.costPrice.toString());
            }}
            required
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold"
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
              <span className="text-zinc-500">Current Cost Price:</span>
              <span className="font-bold">{formatCurrency(selectedProduct.costPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Unit of Measure:</span>
              <span className="font-semibold">{selectedProduct.unit?.name}</span>
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
            label="Purchased Quantity *"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10"
            required
          />
          <Input
            label="Cost Price per Unit (PKR) *"
            type="number"
            step="0.01"
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
            placeholder="2000"
            required
          />
        </div>

        {/* Calculation summary */}
        <div className="p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl space-y-2">
          <div className="flex justify-between text-xs">
            <span className="opacity-80">Total Purchase Cost:</span>
            <span className="text-base font-extrabold">{formatCurrency(totalCost)}</span>
          </div>
          {selectedProduct && costVal > 0 && (
            <div className="flex justify-between text-[11px] pt-1 border-t border-zinc-700 dark:border-zinc-300">
              <span className="opacity-80">Price Change from Previous:</span>
              <span className="font-bold">
                {priceDiff > 0 ? `+ PKR ${priceDiff} (Increased)` : priceDiff < 0 ? `- PKR ${Math.abs(priceDiff)} (Decreased)` : "No change"}
              </span>
            </div>
          )}
        </div>

        <Input
          label="Purchase Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Seasonal price increase from vendor"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-2/3 font-bold">
            {loading ? "Recording..." : "Record Purchase & Update Stock"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
