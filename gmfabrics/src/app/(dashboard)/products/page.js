"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { ProductTable } from "../../../components/products/productTable.jsx";
import { ProductFormModal } from "../../../components/products/productFormModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Plus, Search, Package } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { Loader } from "../../../components/common/loader.jsx";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Form Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Price History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes, unitRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/brands"),
        api.get("/units"),
      ]);
      setProducts(Array.isArray(prodRes?.data) ? prodRes.data : Array.isArray(prodRes) ? prodRes : []);
      setCategories(Array.isArray(catRes?.data) ? catRes.data : Array.isArray(catRes) ? catRes : []);
      setBrands(Array.isArray(brandRes?.data) ? brandRes.data : Array.isArray(brandRes) ? brandRes : []);
      setUnits(Array.isArray(unitRes?.data) ? unitRes.data : Array.isArray(unitRes) ? unitRes : []);
    } catch (err) {
      console.error("Products error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        showToastSuccess("Product updated successfully!");
      } else {
        await api.post("/products", formData);
        showToastSuccess("New product added to catalog!");
      }
      fetchData();
    } catch (err) {
      showToastError(err.message || "Failed to save product.");
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirmDelete("Deactivate Product?", "Are you sure you want to deactivate this fabric product?");
    if (isConfirmed) {
      try {
        await api.delete(`/products/${id}`);
        showToastSuccess("Product deactivated successfully.");
        fetchData();
      } catch (err) {
        showToastError(err.message || "Failed to delete product.");
      }
    }
  };

  const handleViewHistory = async (product) => {
    setSelectedProduct(product);
    setShowHistoryModal(true);
    try {
      const res = await api.get(`/products/${product.id}/price-history`);
      if (res.data) setPriceHistory(res.data);
    } catch (err) {
      console.error("Price history error:", err);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fabric Products Catalog"
        description="Manage your inventory items, pricing, measurement units, and barcode SKUs."
        action={
          <Button
            onClick={() => {
              setEditingProduct(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 font-bold"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </Button>
        }
      />

      <Card>
        {/* Search */}
        <div className="mb-4 relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search catalog by name, barcode, SKU..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
          />
        </div>

        {loading ? (
          <Loader text="Loading fabric products catalog..." icon={Package} />
        ) : (
          <ProductTable
            products={filtered}
            onEdit={(prod) => {
              setEditingProduct(prod);
              setShowModal(true);
            }}
            onDelete={handleDelete}
            onViewHistory={handleViewHistory}
          />
        )}
      </Card>

      {/* Product Add/Edit Modal */}
      <ProductFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingProduct}
        categories={categories}
        brands={brands}
        units={units}
      />

      {/* Price History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Purchase Price History — ${selectedProduct?.name || ""}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Historical vendor purchase cost entries recorded in stock entries:
          </p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-60 overflow-y-auto">
            {priceHistory.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No purchase entries recorded yet.</p>
            ) : (
              priceHistory.map((h) => (
                <div key={h.id} className="py-2 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(h.costPerUnit)} / {selectedProduct?.unit?.symbol || "unit"}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {formatDateTime(h.purchasedAt)} • Vendor: {h.supplier?.name || "Standard"}
                    </p>
                  </div>
                  <span className="font-bold text-zinc-700">
                    Qty: {h.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
