"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { showErrorAlert, showToastError } from "../utils/alerts.js";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  // Cart Line Item Schema:
  // {
  //   cartItemId: string (e.g. "6_batch_15"),
  //   product: object,
  //   batch: object | null,
  //   batchLabel: string,
  //   basePrice: number,
  //   quantity: number,
  //   customDiscount: number, // Manual discount per unit entered by cashier
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
    const availableStock = parseFloat(product.stockQuantity) || 0;

    if (availableStock <= 0) {
      showErrorAlert(
        "Out of Stock!",
        `"${product.name}" is out of stock (${availableStock} available). Cannot add to current bill.`
      );
      return;
    }

    const isDecimalAllowed = product.unit?.allowDecimal !== false;
    const initialQty = isDecimalAllowed ? parseFloat(quantity) : Math.round(parseFloat(quantity));

    if (isNaN(initialQty) || initialQty <= 0) return;

    setItems((prevItems) => {
      const existingProductItems = prevItems.filter((i) => i.product.id === product.id);
      const existingTotalQty = existingProductItems.reduce((sum, i) => sum + i.quantity, 0);

      let requestedTotalQty = existingTotalQty + initialQty;

      if (requestedTotalQty > availableStock) {
        const remainingAllowed = availableStock - existingTotalQty;

        if (remainingAllowed <= 0) {
          showErrorAlert(
            "Stock Limit Reached",
            `Cannot add more "${product.name}". Total available stock is ${availableStock} ${product.unit?.symbol || "pcs"}.`
          );
          return prevItems;
        }

        showToastError(
          `Only ${remainingAllowed} ${product.unit?.symbol || "pcs"} remaining in stock. Cart updated to max available stock (${availableStock}).`
        );
        requestedTotalQty = availableStock;
      }

      let newTotalQty = requestedTotalQty;
      if (!isDecimalAllowed) newTotalQty = Math.round(newTotalQty);

      const activeBatches = (product.stockBatches || [])
        .filter((b) => b.remainingQuantity > 0)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const otherItems = prevItems.filter((i) => i.product.id !== product.id);

      if (activeBatches.length === 0) {
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

    setItems((prevItems) => {
      const targetItem = prevItems.find((i) => i.cartItemId === cartItemId);
      if (!targetItem) return prevItems;

      const product = targetItem.product;
      const availableStock = parseFloat(product.stockQuantity) || 0;

      const otherItemsOfProduct = prevItems.filter((i) => i.product.id === product.id && i.cartItemId !== cartItemId);
      const totalOtherQty = otherItemsOfProduct.reduce((sum, i) => sum + i.quantity, 0);

      let desiredTotalQty = totalOtherQty + qty;

      if (desiredTotalQty > availableStock) {
        const maxQtyForThisLine = Math.max(0, availableStock - totalOtherQty);
        showToastError(
          `Cannot exceed available stock of ${availableStock} for "${product.name}". Max allowed: ${maxQtyForThisLine}`
        );
        qty = maxQtyForThisLine;
        if (qty <= 0) {
          return prevItems.filter((i) => i.cartItemId !== cartItemId);
        }
        desiredTotalQty = totalOtherQty + qty;
      }

      const isDecimalAllowed = product.unit?.allowDecimal !== false;
      if (!isDecimalAllowed) qty = Math.round(qty);
      desiredTotalQty = totalOtherQty + qty;

      const activeBatches = (product.stockBatches || [])
        .filter((b) => b.remainingQuantity > 0)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const otherProductItems = prevItems.filter((i) => i.product.id !== product.id);

      if (activeBatches.length === 0) {
        const basePrice = Math.round(product.salePrice || 0);
        const uPrice = Math.max(0, basePrice - targetItem.customDiscount);
        return [
          ...otherProductItems,
          {
            ...targetItem,
            quantity: qty,
            unitPrice: uPrice,
            subtotal: Math.round(qty * uPrice),
          },
        ];
      }

      let remainingToAllocate = desiredTotalQty;
      const allocatedItems = [];

      for (let idx = 0; idx < activeBatches.length; idx++) {
        if (remainingToAllocate <= 0) break;
        const b = activeBatches[idx];
        const take = Math.min(b.remainingQuantity, remainingToAllocate);
        const basePrice = Math.round(b.sellingPrice > 0 ? b.sellingPrice : (product.salePrice || 0));
        const cItemId = `${product.id}_batch_${b.id}`;

        const existingItem = prevItems.find((i) => i.cartItemId === cItemId);
        const disc = existingItem ? existingItem.customDiscount : 0;
        const uPrice = Math.max(0, basePrice - disc);

        allocatedItems.push({
          cartItemId: cItemId,
          product,
          batch: b,
          batchLabel: `Lot #${b.id}`,
          basePrice,
          quantity: take,
          customDiscount: disc,
          unitPrice: uPrice,
          subtotal: Math.round(take * uPrice),
        });

        remainingToAllocate -= take;
      }

      if (remainingToAllocate > 0) {
        const basePrice = Math.round(product.salePrice || 0);
        const cItemId = `${product.id}_excess`;
        const existingExcess = prevItems.find((i) => i.cartItemId === cItemId);
        const disc = existingExcess ? existingExcess.customDiscount : 0;
        const uPrice = Math.max(0, basePrice - disc);

        allocatedItems.push({
          cartItemId: cItemId,
          product,
          batch: null,
          batchLabel: "Excess Stock",
          basePrice,
          quantity: remainingToAllocate,
          customDiscount: disc,
          unitPrice: uPrice,
          subtotal: Math.round(remainingToAllocate * uPrice),
        });
      }

      return [...otherProductItems, ...allocatedItems];
    });
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
