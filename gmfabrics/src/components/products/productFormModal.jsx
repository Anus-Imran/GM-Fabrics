"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";

export const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  categories = [],
  brands = [],
  units = [],
  suppliers = [],
}) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    categoryId: "",
    brandId: "",
    unitId: "",
    supplierId: "",
    costPrice: "0",
    salePrice: "0",
    stockQuantity: "0",
    lowStockAlert: "10",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
        costPrice: initialData.costPrice?.toString() || "0",
        salePrice: initialData.salePrice?.toString() || "0",
        stockQuantity: initialData.stockQuantity?.toString() || "0",
        lowStockAlert: initialData.lowStockAlert?.toString() || "10",
        createdAt: "",
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
        costPrice: "0",
        salePrice: "0",
        stockQuantity: "0",
        lowStockAlert: "10",
        createdAt: "",
      });
    }
  }, [initialData, categories, units, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.categoryId || !formData.unitId || !formData.salePrice) {
      setError("Please fill in Product Name, Category, Unit, and Sale Price.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Fabric Product" : "Add New Fabric Product"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <Input
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Gul Ahmed Premium Embroidered Lawn"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="SKU Code"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="GA-LNW-001"
          />
          <Input
            label="Barcode Number"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            placeholder="890123456789"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category *
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              required
              className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Brand</label>
            <select
              name="brandId"
              value={formData.brandId}
              onChange={handleChange}
              className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            >
              <option value="">None / Unbranded</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Unit *
            </label>
            <select
              name="unitId"
              value={formData.unitId}
              onChange={handleChange}
              required
              className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg font-bold"
            >
              <option value="">Select Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cost Price per Unit (PKR)"
            type="number"
            step="0.01"
            name="costPrice"
            value={formData.costPrice}
            onChange={handleChange}
            placeholder="1500"
          />
          <Input
            label="Selling Price per Unit (PKR)"
            type="number"
            step="0.01"
            name="salePrice"
            value={formData.salePrice}
            onChange={handleChange}
            placeholder="2200"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Initial Stock Qty"
            type="number"
            step="0.01"
            name="stockQuantity"
            value={formData.stockQuantity}
            onChange={handleChange}
            placeholder="50"
          />
          <Input
            label="Low Stock Alert Threshold"
            type="number"
            step="0.01"
            name="lowStockAlert"
            value={formData.lowStockAlert}
            onChange={handleChange}
            placeholder="10"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Record / Entry Date & Time (Optional)
          </label>
          <input
            type="datetime-local"
            name="createdAt"
            value={formData.createdAt || ""}
            onChange={handleChange}
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Leave blank to automatically apply current system date & time.
          </p>
        </div>

        <div className="flex gap-3 pt-3">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-2/3 font-bold">
            {loading ? "Saving..." : initialData ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
