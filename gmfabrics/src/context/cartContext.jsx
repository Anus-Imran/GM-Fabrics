"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  // Line item structure:
  // {
  //   cartItemId: string (e.g. "6_batch_15"),
  //   product: object,
  //   batch: object | null,
  //   batchLabel: string,
  //   basePrice: number,
  //   quantity: number,
  //   customDiscount: number, // Manual discount per unit typed by cashier
  //   unitPrice: number,       // basePrice - customDiscount
  //   subtotal: number,
  // }

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
      // Find existing total quantity for this product in cart
      const existingProductItems = prevItems.filter((i) => i.product.id === product.id);
      const existingTotalQty = existingProductItems.reduce((sum, i) => sum + i.quantity, 0);

      let newTotalQty = existingTotalQty + initialQty;
      if (!isDecimalAllowed) newTotalQty = Math.round(newTotalQty);

      // Active batches sorted FIFO (oldest first)
      const activeBatches = (product.stockBatches || [])
        .filter((b) => b.remainingQuantity > 0)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Non-product items preserved
      const otherItems = prevItems.filter((i) => i.product.id !== product.id);

      if (activeBatches.length === 0) {
        // Fallback if no active batches recorded
        const basePrice = Math.round(product.salePrice || 0);
        const existingDefault = existingProductItems.find((i) => i.cartItemId === `${product.id}_default`);
        const disc = existingDefault ? existingDefault.customDiscount : 0;
        const uPrice = Math.max(0, basePrice - disc);
        const subtotal = Math.round(newTotalQty * uPrice);

        return [
          ...otherItems,
          {
            cartItemId: `${product.id}_default`,
            product,
            batch: null,
            batchLabel: "Standard Catalog Rate",
            basePrice,
            quantity: newTotalQty,
            customDiscount: disc,
            unitPrice: uPrice,
            subtotal,
          },
        ];
      }

      // Perform FIFO allocation per batch
      let remainingToAllocate = newTotalQty;
      const allocatedItems = [];

      for (let idx = 0; idx < activeBatches.length; idx++) {
        if (remainingToAllocate <= 0) break;
        const b = activeBatches[idx];
        const take = Math.min(b.remainingQuantity, remainingToAllocate);
        const basePrice = Math.round(b.sellingPrice > 0 ? b.sellingPrice : (product.salePrice || 0));
        const cartItemId = `${product.id}_batch_${b.id}`;

        const existingBatchItem = existingProductItems.find((i) => i.cartItemId === cartItemId);
        const disc = existingBatchItem ? existingBatchItem.customDiscount : 0;
        const uPrice = Math.max(0, basePrice - disc);
        const subtotal = Math.round(take * uPrice);

        allocatedItems.push({
          cartItemId,
          product,
          batch: b,
          batchLabel: `Lot #${b.id}`,
          basePrice,
          quantity: take,
          customDiscount: disc,
          unitPrice: uPrice,
          subtotal,
        });

        remainingToAllocate -= take;
      }

      if (remainingToAllocate > 0) {
        // Fallback for excess quantity over available batch stock
        const basePrice = Math.round(product.salePrice || 0);
        const cartItemId = `${product.id}_excess`;
        const existingExcess = existingProductItems.find((i) => i.cartItemId === cartItemId);
        const disc = existingExcess ? existingExcess.customDiscount : 0;
        const uPrice = Math.max(0, basePrice - disc);
        const subtotal = Math.round(remainingToAllocate * uPrice);

        allocatedItems.push({
          cartItemId,
          product,
          batch: null,
          batchLabel: "Excess Stock",
          basePrice,
          quantity: remainingToAllocate,
          customDiscount: disc,
          unitPrice: uPrice,
          subtotal,
        });
      }

      return [...otherItems, ...allocatedItems];
    });
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    let qty = parseFloat(newQuantity) || 0;
    if (qty <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.cartItemId === cartItemId) {
          const isDecimalAllowed = item.product.unit?.allowDecimal !== false;
          if (!isDecimalAllowed) qty = Math.round(qty);

          const uPrice = Math.max(0, item.basePrice - item.customDiscount);
          const subtotal = Math.round(qty * uPrice);

          return {
            ...item,
            quantity: qty,
            unitPrice: uPrice,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const updateCustomDiscount = (cartItemId, discountPerUnit) => {
    const disc = Math.max(0, parseFloat(discountPerUnit) || 0);

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.cartItemId === cartItemId) {
          const uPrice = Math.max(0, item.basePrice - disc);
          const subtotal = Math.round(item.quantity * uPrice);

          return {
            ...item,
            customDiscount: disc,
            unitPrice: uPrice,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const updateUnitPrice = (cartItemId, newNetRate) => {
    const rate = Math.max(0, parseFloat(newNetRate) || 0);

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.cartItemId === cartItemId) {
          const disc = Math.max(0, item.basePrice - rate);
          const subtotal = Math.round(item.quantity * rate);

          return {
            ...item,
            customDiscount: disc,
            unitPrice: rate,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId) => {
    setItems((prevItems) => prevItems.filter((item) => item.cartItemId !== cartItemId));
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
        updateCustomDiscount,
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
