"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { showErrorAlert, showToastError, showToastSuccess } from "../utils/alerts.js";

export const roundMoney = (v) => Math.round((parseFloat(v) || 0) * 100 + Number.EPSILON) / 100;
const roundQty = (v) => Math.round((parseFloat(v) || 0) * 1000 + Number.EPSILON) / 1000;

const CART_KEY = "gm_cart_v2";
const HELD_KEY = "gm_held_bills_v1";

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / blocked — cart still works in memory
  }
};

/**
 * Prices a cart line the same way the server does:
 * stock is taken FIFO from the product's lots; each lot is sold at its own price
 * minus the per-unit discount, unless the cashier typed a net rate for the whole line.
 */
export const priceLine = (line) => {
  const { product, quantity } = line;
  const disc = parseFloat(line.discountPerUnit) || 0;
  const override = line.overridePrice === null || line.overridePrice === undefined || line.overridePrice === "" ? null : parseFloat(line.overridePrice);

  const lots = (product.stockBatches || [])
    .filter((b) => b.remainingQuantity > 0)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id);

  let remaining = roundQty(quantity);
  const allocations = [];
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = roundQty(Math.min(lot.remainingQuantity, remaining));
    const listPrice = roundMoney(lot.sellingPrice > 0 ? lot.sellingPrice : product.salePrice || 0);
    allocations.push({ batchId: lot.id, quantity: take, listPrice });
    remaining = roundQty(remaining - take);
  }
  if (remaining > 0) {
    allocations.push({ batchId: null, quantity: remaining, listPrice: roundMoney(product.salePrice || 0) });
  }

  let subtotal = 0;
  let listSubtotal = 0;
  for (const a of allocations) {
    const unitPrice = override !== null ? roundMoney(override) : roundMoney(Math.max(0, a.listPrice - disc));
    a.unitPrice = unitPrice;
    subtotal = roundMoney(subtotal + roundMoney(a.quantity * unitPrice));
    listSubtotal = roundMoney(listSubtotal + a.quantity * a.listPrice);
  }

  const qty = roundQty(quantity) || 1;
  const prices = [...new Set(allocations.map((a) => a.listPrice))];
  return {
    allocations,
    subtotal,
    listSubtotal,
    basePrice: roundMoney(listSubtotal / qty),
    unitPrice: roundMoney(subtotal / qty),
    mixedPrices: prices.length > 1,
    lotCount: allocations.length,
    savings: roundMoney(Math.max(0, listSubtotal - subtotal)),
  };
};

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // Line: { cartItemId, product, quantity, discountPerUnit, overridePrice }
  const [lines, setLines] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discountType, setDiscountType] = useState(null); // "PERCENTAGE" | "FLAT" | null
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [heldBills, setHeldBills] = useState([]);
  const hydrated = useRef(false);

  // Restore the cart and held bills after a refresh / accidental tab close.
  useEffect(() => {
    const saved = readJson(CART_KEY, null);
    if (saved?.lines?.length) {
      setLines(saved.lines);
      setSelectedCustomer(saved.selectedCustomer || null);
      setDiscountType(saved.discountType || null);
      setDiscountValue(saved.discountValue || 0);
      setNotes(saved.notes || "");
    }
    setHeldBills(readJson(HELD_KEY, []));
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    writeJson(CART_KEY, { lines, selectedCustomer, discountType, discountValue, notes });
  }, [lines, selectedCustomer, discountType, discountValue, notes]);

  useEffect(() => {
    if (!hydrated.current) return;
    writeJson(HELD_KEY, heldBills);
  }, [heldBills]);

  const stockOf = (product) => Math.max(0, parseFloat(product.stockQuantity) || 0);
  const allowsDecimal = (product) => product.unit?.allowDecimal !== false;

  const addToCart = useCallback((product, quantity = 1) => {
    if (!product || product.isActive === false) {
      showToastError("Cannot add inactive product to cart.");
      return;
    }
    const available = stockOf(product);
    if (available <= 0) {
      showErrorAlert("Out of Stock", `"${product.name}" has 0 stock remaining and cannot be added to cart.`);
      return;
    }
    let addQty = parseFloat(quantity);
    if (!allowsDecimal(product)) addQty = Math.round(addQty);
    if (isNaN(addQty) || addQty <= 0) return;

    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const current = existing ? existing.quantity : 0;
      let next = roundQty(current + addQty);
      if (next > available) {
        if (available - current <= 0) {
          showErrorAlert("Stock Limit Reached", `Only ${available} ${product.unit?.symbol || "pcs"} of "${product.name}" is in stock.`);
          return prev;
        }
        showToastError(`Only ${available} ${product.unit?.symbol || "pcs"} in stock — quantity set to the maximum.`);
        next = available;
      }
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, product, quantity: next } : l));
      }
      return [...prev, { cartItemId: String(product.id), product, quantity: next, discountPerUnit: 0, overridePrice: null }];
    });
  }, []);

  const updateQuantity = useCallback((cartItemId, newQuantity) => {
    setLines((prev) => {
      const line = prev.find((l) => l.cartItemId === cartItemId);
      if (!line) return prev;
      let qty = parseFloat(newQuantity);
      if (isNaN(qty)) qty = 0;
      if (qty <= 0) return prev.filter((l) => l.cartItemId !== cartItemId);
      if (!allowsDecimal(line.product)) qty = Math.max(1, Math.round(qty));
      const available = stockOf(line.product);
      if (qty > available) {
        showToastError(`Cannot exceed available stock of ${available} for "${line.product.name}".`);
        qty = available;
      }
      return prev.map((l) => (l.cartItemId === cartItemId ? { ...l, quantity: roundQty(qty) } : l));
    });
  }, []);

  const updateCustomDiscount = useCallback((cartItemId, discountPerUnit) => {
    const disc = Math.max(0, parseFloat(discountPerUnit) || 0);
    setLines((prev) => prev.map((l) => (l.cartItemId === cartItemId ? { ...l, discountPerUnit: disc, overridePrice: null } : l)));
  }, []);

  // Cashier types the final net rate for the whole line.
  const updateUnitPrice = useCallback((cartItemId, newNetRate) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.cartItemId !== cartItemId) return l;
        if (newNetRate === "" || newNetRate === null) return { ...l, overridePrice: null };
        return { ...l, overridePrice: Math.max(0, parseFloat(newNetRate) || 0), discountPerUnit: 0 };
      })
    );
  }, []);

  const removeFromCart = useCallback((cartItemId) => {
    setLines((prev) => prev.filter((l) => l.cartItemId !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setSelectedCustomer(null);
    setDiscountType(null);
    setDiscountValue(0);
    setNotes("");
  }, []);

  /** Swap fresh product data (stock, lots, prices) into the cart after the catalog reloads. */
  const refreshProducts = useCallback((products) => {
    const map = new Map(products.map((p) => [p.id, p]));
    setLines((prev) => {
      let changed = false;
      const next = [];
      for (const l of prev) {
        const fresh = map.get(l.product.id);
        if (!fresh) {
          changed = true;
          continue;
        }
        const available = stockOf(fresh);
        const qty = Math.min(l.quantity, available);
        if (qty !== l.quantity || fresh !== l.product) changed = true;
        if (qty > 0) next.push({ ...l, product: fresh, quantity: qty });
      }
      return changed ? next : prev;
    });
  }, []);

  /* ---------------- Held (parked) bills ---------------- */

  const holdCurrentBill = useCallback(
    (label) => {
      if (lines.length === 0) {
        showToastError("Cart is empty — nothing to hold.");
        return false;
      }
      const bill = {
        id: `H${Date.now()}`,
        label: label || selectedCustomer?.name || `Bill ${new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}`,
        createdAt: new Date().toISOString(),
        lines,
        selectedCustomer,
        discountType,
        discountValue,
        notes,
      };
      setHeldBills((prev) => [bill, ...prev].slice(0, 20));
      clearCart();
      showToastSuccess(`Bill held: ${bill.label}`);
      return true;
    },
    [lines, selectedCustomer, discountType, discountValue, notes, clearCart]
  );

  const recallHeldBill = useCallback(
    (id) => {
      const bill = heldBills.find((b) => b.id === id);
      if (!bill) return;
      setHeldBills((prev) => {
        const rest = prev.filter((b) => b.id !== id);
        // Current cart (if any) is parked so nothing is lost.
        if (lines.length > 0) {
          return [
            {
              id: `H${Date.now()}`,
              label: selectedCustomer?.name || "Swapped bill",
              createdAt: new Date().toISOString(),
              lines,
              selectedCustomer,
              discountType,
              discountValue,
              notes,
            },
            ...rest,
          ];
        }
        return rest;
      });
      setLines(bill.lines);
      setSelectedCustomer(bill.selectedCustomer || null);
      setDiscountType(bill.discountType || null);
      setDiscountValue(bill.discountValue || 0);
      setNotes(bill.notes || "");
    },
    [heldBills, lines, selectedCustomer, discountType, discountValue, notes]
  );

  const deleteHeldBill = useCallback((id) => setHeldBills((prev) => prev.filter((b) => b.id !== id)), []);

  /* ---------------- Totals ---------------- */

  const items = useMemo(() => lines.map((l) => ({ ...l, ...priceLine(l) })), [lines]);

  const subtotal = useMemo(() => roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0)), [items]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === "PERCENTAGE" && val > 0) return roundMoney((subtotal * Math.min(val, 100)) / 100);
    if (discountType === "FLAT" && val > 0) return roundMoney(Math.min(val, subtotal));
    return 0;
  }, [subtotal, discountType, discountValue]);

  const totalAmount = useMemo(() => roundMoney(Math.max(0, subtotal - discountAmount)), [subtotal, discountAmount]);

  const totalSavings = useMemo(
    () => roundMoney(items.reduce((s, i) => s + i.savings, 0) + discountAmount),
    [items, discountAmount]
  );

  /** Request body for POST /sales (prices are recomputed and enforced by the server). */
  const buildSaleItems = useCallback(
    () =>
      lines.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        ...(l.overridePrice !== null && l.overridePrice !== undefined ? { unitPrice: l.overridePrice } : {}),
        ...(l.discountPerUnit > 0 ? { discountPerUnit: l.discountPerUnit } : {}),
      })),
    [lines]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        selectedCustomer,
        discountType,
        discountValue,
        notes,
        subtotal,
        discountAmount,
        totalAmount,
        totalSavings,
        heldBills,
        addToCart,
        updateQuantity,
        updateCustomDiscount,
        updateUnitPrice,
        removeFromCart,
        clearCart,
        refreshProducts,
        buildSaleItems,
        holdCurrentBill,
        recallHeldBill,
        deleteHeldBill,
        setSelectedCustomer,
        setDiscountType,
        setDiscountValue,
        setNotes,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
