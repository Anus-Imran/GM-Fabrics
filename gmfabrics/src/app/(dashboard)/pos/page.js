"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ShoppingBag, AlertTriangle, RefreshCw } from "lucide-react";
import { ProductSearch } from "../../../components/pos/productSearch.jsx";
import { ProductGrid } from "../../../components/pos/productGrid.jsx";
import { CartPanel } from "../../../components/pos/cartPanel.jsx";
import { PaymentModal } from "../../../components/pos/paymentModal.jsx";
import { ReceiptModal } from "../../../components/pos/receiptModal.jsx";
import { HeldBillsModal } from "../../../components/pos/heldBillsModal.jsx";
import { useCart } from "../../../context/cartContext.jsx";
import { useHotkeys } from "../../../hooks/useHotkeys.js";
import api from "../../../services/apiService.js";
import { Loader } from "../../../components/common/loader.jsx";
import { Button } from "../../../components/common/button.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { confirmAction, showToastError, showToastInfo } from "../../../utils/alerts.js";

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);

  const searchRef = useRef(null);
  const customerRef = useRef(null);
  const discountRef = useRef(null);

  const { items, totalAmount, addToCart, refreshProducts, holdCurrentBill, clearCart } = useCart();

  // Lean POS catalog: only the fields the counter needs.
  const fetchProducts = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setLoadError("");
      try {
        const res = await api.get("/products", { params: { view: "pos" } });
        const list = res.data || [];
        setProducts(list);
        refreshProducts(list);
      } catch (err) {
        if (!silent) setLoadError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [refreshProducts]
  );

  useEffect(() => {
    fetchProducts();
    api
      .get("/categories")
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [fetchProducts]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 120);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredProducts = useMemo(
    () =>
      products
        .filter((p) => {
        if (selectedCategory && p.categoryId !== selectedCategory) return false;
        if (!debouncedSearch) return true;
        return (
          p.name.toLowerCase().includes(debouncedSearch) ||
          (p.barcode && p.barcode.toLowerCase().includes(debouncedSearch)) ||
          (p.sku && p.sku.toLowerCase().includes(debouncedSearch))
        );
        })
        .sort((a, b) => (a.stockQuantity > 0 ? 0 : 1) - (b.stockQuantity > 0 ? 0 : 1)),
    [products, selectedCategory, debouncedSearch]
  );

  const cartQtyById = useMemo(() => new Map(items.map((i) => [i.product.id, i.quantity])), [items]);

  // Scanner / Enter: exact barcode or SKU first, then a single name match.
  const handleBarcodeSubmit = async (code) => {
    if (!code) return;
    const local = products.find((p) => p.barcode === code || (p.sku && p.sku.toLowerCase() === code.toLowerCase()));
    if (local) {
      addToCart(local);
      setSearchTerm("");
      return;
    }
    try {
      const res = await api.get(`/products/code/${encodeURIComponent(code)}`);
      if (res.data) {
        addToCart(res.data);
        setSearchTerm("");
      }
    } catch {
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchTerm("");
      } else if (filteredProducts.length === 0) {
        showToastError(`No product found for "${code}"`);
      } else {
        showToastInfo(`${filteredProducts.length} products match — click one to add it.`);
      }
    }
  };

  const openCheckout = () => {
    if (items.length === 0) {
      showToastError("Add at least one product to the cart.");
      return;
    }
    setShowMobileCart(false);
    setShowPaymentModal(true);
  };

  const handleClear = async () => {
    if (items.length === 0) return;
    const ok = await confirmAction("Clear the cart?", `Remove all ${items.length} item(s) from this bill?`, "Yes, clear");
    if (ok) clearCart();
  };

  const handleSaleCompletedSuccess = (saleData, opts = {}) => {
    setCompletedSale(saleData);
    setAutoPrint(!!opts.autoPrint);
    setShowReceiptModal(true);

    // Update stock locally right away, then refresh lots quietly in the background.
    const sold = new Map();
    for (const si of saleData.saleItems || []) sold.set(si.productId, (sold.get(si.productId) || 0) + si.quantity);
    setProducts((prev) =>
      prev.map((p) => (sold.has(p.id) ? { ...p, stockQuantity: Math.max(0, p.stockQuantity - sold.get(p.id)) } : p))
    );
    fetchProducts({ silent: true });
  };

  const anyModalOpen = showPaymentModal || showReceiptModal || showHeld;

  useHotkeys(
    {
      F3: () => searchRef.current?.focus(),
      F4: openCheckout,
      F7: () => {
        setShowMobileCart(true);
        setTimeout(() => customerRef.current?.focus(), 50);
      },
      F8: () => holdCurrentBill(),
      F9: () => setShowHeld(true),
      F10: handleClear,
      "Alt+D": () => {
        setShowMobileCart(true);
        setShowDiscount(true);
        setTimeout(() => discountRef.current?.focus(), 50);
      },
    },
    { enabled: !anyModalOpen }
  );

  const cartPanelProps = {
    onOpenCheckout: openCheckout,
    onHold: () => holdCurrentBill(),
    onShowHeld: () => setShowHeld(true),
    onClear: handleClear,
    showDiscount,
    setShowDiscount,
    discountInputRef: discountRef,
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 sm:-m-6 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Left Catalog Column */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 min-w-0 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <ProductSearch ref={searchRef} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onBarcodeSubmit={handleBarcodeSubmit} />
          <Button variant="outline" size="sm" onClick={() => fetchProducts()} tooltip="Reload stock & prices" className="shrink-0 py-2.5">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader text="Loading fabric catalog & active lots..." size="lg" />
            </div>
          ) : loadError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Could not load products</p>
              <p className="text-xs text-zinc-500">{loadError}</p>
              <Button onClick={() => fetchProducts()}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
              </Button>
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onAddToCart={addToCart}
              cartQtyById={cartQtyById}
            />
          )}
        </div>
      </div>

      {/* Right Cart Sidebar (desktop) */}
      <CartPanel ref={customerRef} {...cartPanelProps} className="hidden lg:flex" />

      {/* Cart drawer (tablet / phone) */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowMobileCart(false)} />
          <div className="w-full max-w-md h-full">
            <CartPanel ref={customerRef} {...cartPanelProps} onCloseMobile={() => setShowMobileCart(false)} />
          </div>
        </div>
      )}
      <button
        onClick={() => setShowMobileCart(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-xl cursor-pointer"
      >
        <ShoppingBag className="w-5 h-5" />
        <span>
          {items.length} • {formatCurrency(totalAmount)}
        </span>
      </button>

      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSaleSuccess={handleSaleCompletedSuccess} />

      <ReceiptModal
        isOpen={showReceiptModal}
        autoPrint={autoPrint}
        onClose={() => {
          setShowReceiptModal(false);
          setTimeout(() => searchRef.current?.focus(), 50);
        }}
        sale={completedSale}
      />

      <HeldBillsModal isOpen={showHeld} onClose={() => setShowHeld(false)} />
    </div>
  );
}
