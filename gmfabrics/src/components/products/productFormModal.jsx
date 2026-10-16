"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { blockInvalidNumberKeys } from "../../utils/validators.js";

const ADJUSTMENT_REASONS = [
  { value: "COUNT_CORRECTION", label: "Stock count correction" },
  { value: "DAMAGE", label: "Damaged" },
  { value: "SHRINKAGE", label: "Shrinkage / cutting loss" },
  { value: "FOUND", label: "Found stock" },
  { value: "OTHER", label: "Other" },
];

const selectClass =
  "w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100";

export const ProductFormModal = ({ isOpen, onClose, onSubmit, initialData = null, categories = [], brands = [], units = [], suppliers = [] }) => {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        sku: initialData.sku || "",
        barcode: initialData.barcode || "",
        description: initialData.description || "",
        categoryId: initialData.categoryId || "",
        brandId: initialData.brandId || "",
        unitId: initialData.unitId || "",
        supplierId: initialData.supplierId || "",
        costPrice: initialData.costPrice?.toString() ?? "0",
        salePrice: initialData.salePrice?.toString() ?? "0",
        stockQuantity: initialData.stockQuantity?.toString() ?? "0",
        lowStockAlert: initialData.lowStockAlert?.toString() ?? "10",
        adjustmentReason: "COUNT_CORRECTION",
        adjustmentNotes: "",
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        barcode: "",
        description: "",
        categoryId: categories[0]?.id || "",
        brandId: "",
        unitId: units[0]?.id || "",
        supplierId: "",
        costPrice: "",
        salePrice: "",
        stockQuantity: "0",
        lowStockAlert: "10",
        createdAt: "",
      });
    }
  }, [initialData, categories, units, isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const unit = units.find((u) => String(u.id) === String(formData.unitId));
  const cost = parseFloat(formData.costPrice) || 0;
  const sale = parseFloat(formData.salePrice);
  const stock = parseFloat(formData.stockQuantity) || 0;
  const stockChanged = isEdit && Math.abs(stock - (initialData.stockQuantity || 0)) > 0.0005;
  const marginPct = cost > 0 && sale > 0 ? Math.round(((sale - cost) / cost) * 100) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name?.trim() || !formData.categoryId || !formData.unitId || formData.salePrice === "" || isNaN(sale)) {
      setError("Please fill in Product Name, Category, Unit, and Sale Price.");
      return;
    }
    if (sale < 0 || cost < 0 || stock < 0 || (parseFloat(formData.lowStockAlert) || 0) < 0) {
      setError("Prices and quantities cannot be negative.");
      return;
    }
    if (unit && unit.allowDecimal === false && !Number.isInteger(stock)) {
      setError(`Stock for "${unit.name}" must be a whole number.`);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || null,
      barcode: formData.barcode.trim() || null,
      description: formData.description?.trim() || null,
      categoryId: formData.categoryId,
      brandId: formData.brandId || null,
      unitId: formData.unitId,
      supplierId: formData.supplierId || null,
      costPrice: cost,
      salePrice: sale,
      lowStockAlert: parseFloat(formData.lowStockAlert) || 0,
      ...(isEdit
        ? stockChanged
          ? { stockQuantity: stock, adjustmentReason: formData.adjustmentReason, adjustmentNotes: formData.adjustmentNotes || null }
          : {}
        : { stockQuantity: stock, createdAt: formData.createdAt || undefined }),
    };

    setLoading(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Fabric Product" : "Add New Fabric Product"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <Input
          label="Product Name"
          name="name"
          value={formData.name || ""}
          maxLength={191}
          onChange={handleChange}
          placeholder="e.g. Gul Ahmed Premium Embroidered Lawn"
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="SKU Code" name="sku" value={formData.sku || ""} maxLength={64} onChange={handleChange} placeholder="GA-LNW-001" />
          <Input label="Barcode Number" name="barcode" value={formData.barcode || ""} maxLength={64} onChange={handleChange} placeholder="890123456789" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category *</label>
            <select name="categoryId" value={formData.categoryId || ""} onChange={handleChange} required className={selectClass}>
              <option value="">Select</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Brand</label>
            <select name="brandId" value={formData.brandId || ""} onChange={handleChange} className={selectClass}>
              <option value="">Unbranded</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Unit *</label>
            <select name="unitId" value={formData.unitId || ""} onChange={handleChange} required className={`${selectClass} font-bold`}>
              <option value="">Select</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Supplier</label>
            <select name="supplierId" value={formData.supplierId || ""} onChange={handleChange} className={selectClass}>
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cost Price per Unit (PKR)"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            name="costPrice"
            value={formData.costPrice ?? ""}
            onKeyDown={blockInvalidNumberKeys}
            onChange={handleChange}
            placeholder="1500"
          />
          <Input
            label="Selling Price per Unit (PKR)"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            name="salePrice"
            value={formData.salePrice ?? ""}
            onKeyDown={blockInvalidNumberKeys}
            onChange={handleChange}
            placeholder="2200"
            required
            error={!isNaN(sale) && sale < cost ? "Selling price is below cost" : null}
          />
        </div>
        {marginPct !== null && sale >= cost && <p className="text-[11px] text-emerald-600 font-semibold -mt-2">Margin: {marginPct}% over cost</p>}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={isEdit ? "Current Stock Qty" : "Opening Stock Qty"}
            type="number"
            inputMode="decimal"
            min="0"
            step={unit?.allowDecimal === false ? "1" : "any"}
            name="stockQuantity"
            value={formData.stockQuantity ?? ""}
            onKeyDown={blockInvalidNumberKeys}
            onChange={handleChange}
            placeholder="50"
          />
          <Input
            label="Low Stock Alert Threshold"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            name="lowStockAlert"
            value={formData.lowStockAlert ?? ""}
            onKeyDown={blockInvalidNumberKeys}
            onChange={handleChange}
            placeholder="10"
          />
        </div>

        {stockChanged && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
              Stock changes by {(stock - initialData.stockQuantity).toFixed(3).replace(/\.?0+$/, "")} — this is saved as a stock adjustment.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select name="adjustmentReason" value={formData.adjustmentReason} onChange={handleChange} className={selectClass}>
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                name="adjustmentNotes"
                value={formData.adjustmentNotes || ""}
                onChange={handleChange}
                maxLength={500}
                placeholder="Note (optional)"
                className={selectClass}
              />
            </div>
          </div>
        )}

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Record / Entry Date & Time (Optional)</label>
            <input
              type="datetime-local"
              name="createdAt"
              value={formData.createdAt || ""}
              onChange={handleChange}
              className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Leave blank to use the current date & time.</p>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} loadingText="Saving..." className="w-2/3 font-bold">
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
