"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

const CartContext = createContext();

export const calculateFifoProductPrice = (product, quantity, isManualOverride = false, customUnitPrice = null) => {
  const isDecimalAllowed = product?.unit?.allowDecimal !== false;
  const qty = isDecimalAllowed ? parseFloat(quantity) : Math.round(parseFloat(quantity));

  if (!product || qty <= 0) {
    return { subtotal: 0, unitPrice: product?.salePrice || 0, batchBreakdown: [], isMultiBatch: false };
  }

  if (isManualOverride && customUnitPrice !== null) {
    const uPrice = Math.round(parseFloat(customUnitPrice) || 0);
    return {
      subtotal: Math.round(qty * uPrice),
      unitPrice: uPrice,
      batchBreakdown: [{ quantity: qty, sellingPrice: uPrice, costPrice: product.costPrice || 0 }],
      isMultiBatch: false,
      isManualOverride: true,
    };
  }

  const activeBatches = (product.stockBatches || [])
    .filter((b) => b.remainingQuantity > 0)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (activeBatches.length === 0) {
    const unitPrice = Math.round(product.salePrice || 0);
    return {
      subtotal: Math.round(qty * unitPrice),
      unitPrice,
      batchBreakdown: [{ quantity: qty, sellingPrice: unitPrice, costPrice: product.costPrice || 0 }],
      isMultiBatch: false,
    };
  }

  let remaining = qty;
  let totalSubtotal = 0;
  const breakdown = [];

  for (const b of activeBatches) {
    if (remaining <= 0) break;
    const take = Math.min(b.remainingQuantity, remaining);
    const bPrice = b.sellingPrice > 0 ? b.sellingPrice : (product.salePrice || 0);
    totalSubtotal += take * bPrice;
    breakdown.push({
      batchId: b.id,
      quantity: take,
      sellingPrice: bPrice,
      costPrice: b.costPrice,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    const fallbackPrice = product.salePrice || 0;
    totalSubtotal += remaining * fallbackPrice;
    breakdown.push({
      quantity: remaining,
      sellingPrice: fallbackPrice,
      costPrice: product.costPrice || 0,
    });
  }

  const subtotal = Math.round(totalSubtotal);
  const unitPrice = Math.round(subtotal / qty);

  return {
    subtotal,
    unitPrice,
    batchBreakdown: breakdown,
    isMultiBatch: breakdown.length > 1,
  };
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]); // { product, quantity, unitPrice, subtotal, batchBreakdown, isMultiBatch, isManualOverride }
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discountType, setDiscountType] = useState(null); // "PERCENTAGE" | "FLAT" | null
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // "CASH" | "CARD" | "CREDIT"
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");

  const addToCart = (product, quantity = 1) => {
    const isDecimalAllowed = product.unit?.allowDecimal !== false;
    const initialQty = isDecimalAllowed ? parseFloat(quantity) : Math.round(parseFloat(quantity));

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
      let newQty = initialQty;
      let isManual = false;
      let manualPrice = null;

      if (existingIndex > -1) {
        newQty = prevItems[existingIndex].quantity + initialQty;
        if (!isDecimalAllowed) newQty = Math.round(newQty);
        isManual = prevItems[existingIndex].isManualOverride || false;
        manualPrice = prevItems[existingIndex].unitPrice;
      }

      const fifoResult = calculateFifoProductPrice(product, newQty, isManual, manualPrice);

      const newItemObj = {
        product,
        quantity: newQty,
        unitPrice: fifoResult.unitPrice,
        subtotal: fifoResult.subtotal,
        batchBreakdown: fifoResult.batchBreakdown,
        isMultiBatch: fifoResult.isMultiBatch,
        isManualOverride: isManual,
      };

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = newItemObj;
        return updated;
      } else {
        return [...prevItems, newItemObj];
      }
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    let qty = parseFloat(newQuantity) || 0;
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          const isDecimalAllowed = item.product.unit?.allowDecimal !== false;
          if (!isDecimalAllowed) {
            qty = Math.round(qty);
          }

          const fifoResult = calculateFifoProductPrice(
            item.product,
            qty,
            item.isManualOverride,
            item.unitPrice
          );

          return {
            ...item,
            quantity: qty,
            unitPrice: fifoResult.unitPrice,
            subtotal: fifoResult.subtotal,
            batchBreakdown: fifoResult.batchBreakdown,
            isMultiBatch: fifoResult.isMultiBatch,
          };
        }
        return item;
      })
    );
  };

  const updateUnitPrice = (productId, newPrice) => {
    const price = Math.round(parseFloat(newPrice) || 0);
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          const subtotal = Math.round(item.quantity * price);
          return {
            ...item,
            unitPrice: price,
            subtotal,
            isManualOverride: true,
            isMultiBatch: false,
            batchBreakdown: [{ quantity: item.quantity, sellingPrice: price, costPrice: item.product.costPrice || 0 }],
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
    setSelectedCustomer(null);
    setDiscountType(null);
    setDiscountValue(0);
    setPaymentMethod("CASH");
    setAmountPaid("");
    setNotes("");
  };

  const subtotal = useMemo(() => {
    return Math.round(items.reduce((sum, item) => sum + item.subtotal, 0));
  }, [items]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === "PERCENTAGE" && val > 0) {
      return Math.round((subtotal * val) / 100);
    }
    if (discountType === "FLAT" && val > 0) {
      return Math.round(Math.min(val, subtotal));
    }
    return 0;
  }, [subtotal, discountType, discountValue]);

  const totalAmount = useMemo(() => {
    return Math.round(Math.max(0, subtotal - discountAmount));
  }, [subtotal, discountAmount]);

  const changeAmount = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    return Math.round(Math.max(0, paid - totalAmount));
  }, [amountPaid, totalAmount]);

  return (
    <CartContext.Provider
      value={{
        items,
        selectedCustomer,
        discountType,
        discountValue,
        paymentMethod,
        amountPaid,
        notes,
        subtotal,
        discountAmount,
        totalAmount,
        changeAmount,
        addToCart,
        updateQuantity,
        updateUnitPrice,
        removeFromCart,
        clearCart,
        setSelectedCustomer,
        setDiscountType,
        setDiscountValue,
        setPaymentMethod,
        setAmountPaid,
        setNotes,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
