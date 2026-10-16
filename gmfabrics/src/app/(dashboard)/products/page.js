"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { ProductTable } from "../../../components/products/productTable.jsx";
import { ProductFormModal } from "../../../components/products/productFormModal.jsx";
import { StockAdjustModal } from "../../../components/products/stockAdjustModal.jsx";
import { BarcodeLabelModal } from "../../../components/products/barcodeLabelModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Plus, Package, AlertTriangle, RefreshCw } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { Loader } from "../../../components/common/loader.jsx";
import { useAuth } from "../../../context/authContext.jsx";
import { useHotkeys } from "../../../hooks/useHotkeys.js";

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [labelProduct, setLabelProduct] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoadError("");
    try {
      const res = await api.get("/products");
      setProducts(res.data || []);
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        api.get("/categories").then((r) => setCategories(r.data || [])).catch(() => {}),
        api.get("/brands").then((r) => setBrands(r.data || [])).catch(() => {}),
        api.get("/units").then((r) => setUnits(r.data || [])).catch(() => {}),
        api.get("/suppliers").then((r) => setSuppliers(r.data || [])).catch(() => {}),
      ]);
      setLoading(false);
    })();
  }, [fetchProducts]);

  useHotkeys(
    {
      "Alt+Shift+N": () => {
        if (!isAdmin) return;
        setEditingProduct(null);
        setShowModal(true);
      },
    },
    { enabled: !showModal }
  );

  // Errors are re-thrown so the form shows them and stays open.
  const handleCreateOrUpdate = async (formData) => {
    if (editingProduct) {
      await api.put(`/products/${editingProduct.id}`, formData);
      showToastSuccess("Product updated successfully!");
    } else {
      await api.post("/products", formData);
      showToastSuccess("New product added to catalog!");
    }
    fetchProducts();
  };

  const handleDelete = async (product) => {
    const ok = await confirmDelete(
      `Deactivate "${product.name}"?`,
      product.stockQuantity > 0
        ? `It still has ${product.stockQuantity} ${product.unit?.symbol || ""} in stock. It will be hidden from the POS.`
        : "It will be hidden from the POS and catalog. Sales history is kept."
    );
    if (!ok) return;
    try {
      await api.delete(`/products/${product.id}`);
      showToastSuccess("Product deactivated.");
      fetchProducts();
    } catch (err) {
      showToastError(err.message || "Failed to deactivate product.");
    }
  };

  const handleViewHistory = async (product) => {
    setSelectedProduct(product);
    setPriceHistory([]);
    setShowHistoryModal(true);
    try {
      const res = await api.get(`/products/${product.id}/price-history`);
      setPriceHistory(res.data || []);
    } catch (err) {
      showToastError(err.message);
    }
  };

  const visibleProducts = useMemo(
    () => (lowOnly ? products.filter((p) => p.stockQuantity <= p.lowStockAlert) : products),
    [products, lowOnly]
  );

  const stats = useMemo(() => {
    let qty = 0;
    let value = 0;
    let retail = 0;
    let low = 0;
    for (const p of products) {
      const pQty = Math.max(0, parseFloat(p.stockQuantity) || 0);
      qty += pQty;
      retail += pQty * (p.salePrice || 0);
      if (p.stockQuantity <= p.lowStockAlert) low++;
      if (isAdmin) {
        // FIFO lot valuation; any stock not covered by lots is valued at the current cost.
        let remaining = pQty;
        for (const b of p.stockBatches || []) {
          const take = Math.min(b.remainingQuantity, remaining);
          value += take * (b.costPrice ?? p.costPrice ?? 0);
          remaining -= take;
        }
        if (remaining > 0) value += remaining * (p.costPrice || 0);
      }
    }
    return { qty, value, retail, low };
  }, [products, isAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fabric Products Catalog"
        description="Manage inventory items, pricing, measurement units, barcodes and stock adjustments."
        action={
          isAdmin && (
            <Button
              onClick={() => {
                setEditingProduct(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 font-bold"
              tooltip="Add product"
              shortcut="Alt+Shift+N"
            >
              <Plus className="w-4 h-4" /> Add New Product
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Catalog Products</span>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{products.length}</div>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Units in Stock</span>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{Math.round(stats.qty * 100) / 100}</div>
        </div>
        <button
          onClick={() => setLowOnly((v) => !v)}
          className={`text-left p-4 rounded-2xl border shadow-xs space-y-1 cursor-pointer ${
            lowOnly ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Low / Out of Stock
          </span>
          <div className="text-2xl font-black">{stats.low}</div>
          <p className="text-[10px] opacity-70">{lowOnly ? "Showing only low stock — click to show all" : "Click to filter"}</p>
        </button>
        <div className="p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-2xl shadow-md space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">{isAdmin ? "Stock Value (cost)" : "Stock Value (retail)"}</span>
          <div className="text-2xl font-black">{formatCurrency(isAdmin ? stats.value : stats.retail)}</div>
          {isAdmin && <p className="text-[10px] opacity-70">Retail value {formatCurrency(stats.retail)}</p>}
        </div>
      </div>

      <Card>
        {loading ? (
          <Loader text="Loading fabric products catalog..." icon={Package} />
        ) : loadError ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-red-600">{loadError}</p>
            <Button onClick={fetchProducts}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
            </Button>
          </div>
        ) : (
          <ProductTable
            products={visibleProducts}
            isAdmin={isAdmin}
            onEdit={(prod) => {
              setEditingProduct(prod);
              setShowModal(true);
            }}
            onDelete={handleDelete}
            onViewHistory={handleViewHistory}
            onAdjust={setAdjustProduct}
            onLabels={setLabelProduct}
          />
        )}
      </Card>

      <ProductFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingProduct}
        categories={categories}
        brands={brands}
        units={units}
        suppliers={suppliers}
      />

      <StockAdjustModal isOpen={!!adjustProduct} onClose={() => setAdjustProduct(null)} product={adjustProduct} onDone={fetchProducts} />
      <BarcodeLabelModal isOpen={!!labelProduct} onClose={() => setLabelProduct(null)} product={labelProduct} />

      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Purchase Price History — ${selectedProduct?.name || ""}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">Purchase cost of each stock entry:</p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-72 overflow-y-auto">
            {priceHistory.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No purchase entries recorded yet.</p>
            ) : (
              priceHistory.map((h) => (
                <div key={h.id} className="py-2 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(h.costPerUnit)} / {selectedProduct?.unit?.symbol || "unit"}
                      {h.priceDiff ? (
                        <span className={`ml-2 text-[10px] ${h.priceDiff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                          {h.priceDiff > 0 ? "▲" : "▼"} {formatCurrency(Math.abs(h.priceDiff))}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {formatDateTime(h.purchasedAt)} • {h.supplier?.name || "No supplier"}
                      {h.invoiceNumber ? ` • Inv ${h.invoiceNumber}` : ""}
                    </p>
                  </div>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">Qty: {h.quantity}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
