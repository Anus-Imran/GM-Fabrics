"use client";

import React, { useState, useEffect } from "react";
import { ProductSearch } from "../../../components/pos/productSearch.jsx";
import { ProductGrid } from "../../../components/pos/productGrid.jsx";
import { CartPanel } from "../../../components/pos/cartPanel.jsx";
import { PaymentModal } from "../../../components/pos/paymentModal.jsx";
import { ReceiptModal } from "../../../components/pos/receiptModal.jsx";
import { useCart } from "../../../context/cartContext.jsx";
import api from "../../../services/apiService.js";

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const { addToCart } = useCart();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/customers"),
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (custRes.data) setCustomers(custRes.data);
    } catch (err) {
      console.error("POS initial data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = async (barcode) => {
    if (!barcode) return;
    try {
      const res = await api.get(`/products/search?barcode=${barcode}`);
      if (res.data && res.data.length > 0) {
        addToCart(res.data[0]);
        setSearchTerm("");
      }
    } catch (err) {
      console.error("Barcode scan error:", err);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm)) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSaleCompletedSuccess = (saleData) => {
    setCompletedSale(saleData);
    setShowReceiptModal(true);
    // Refresh product stock
    fetchInitialData();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Left Catalog Column */}
      <div className="flex-1 flex flex-col p-6 min-w-0 overflow-hidden">
        {/* Search */}
        <div className="mb-4">
          <ProductSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onBarcodeSubmit={handleBarcodeSubmit}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              Loading Fabric Catalog...
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onAddToCart={addToCart}
            />
          )}
        </div>
      </div>

      {/* Right Cart Sidebar */}
      <CartPanel
        customers={customers}
        onOpenCheckout={() => setShowPaymentModal(true)}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSaleSuccess={handleSaleCompletedSuccess}
      />

      {/* Printable Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        sale={completedSale}
      />
    </div>
  );
}
