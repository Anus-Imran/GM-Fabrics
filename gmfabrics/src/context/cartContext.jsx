"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]); // { product, quantity, unitPrice, subtotal }
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
      if (existingIndex > -1) {
        const updated = [...prevItems];
        let newQty = updated[existingIndex].quantity + initialQty;
        if (!isDecimalAllowed) newQty = Math.round(newQty);

        const subtotal = Math.round(newQty * updated[existingIndex].unitPrice);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotal,
        };
        return updated;
      } else {
        const unitPrice = Math.round(product.salePrice);
        const subtotal = Math.round(initialQty * unitPrice);
        return [
          ...prevItems,
          {
            product,
            quantity: initialQty,
            unitPrice,
            subtotal,
          },
        ];
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
          const subtotal = Math.round(qty * item.unitPrice);
          return {
            ...item,
            quantity: qty,
            subtotal,
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
