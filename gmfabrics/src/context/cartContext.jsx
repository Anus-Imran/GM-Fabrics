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
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotal: newQty * updated[existingIndex].unitPrice,
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            product,
            quantity,
            unitPrice: product.salePrice,
            subtotal: quantity * product.salePrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    const qty = parseFloat(newQuantity) || 0;
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: qty,
            subtotal: qty * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const updateUnitPrice = (productId, newPrice) => {
    const price = parseFloat(newPrice) || 0;
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            unitPrice: price,
            subtotal: item.quantity * price,
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
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === "PERCENTAGE" && val > 0) {
      return (subtotal * val) / 100;
    }
    if (discountType === "FLAT" && val > 0) {
      return Math.min(val, subtotal);
    }
    return 0;
  }, [subtotal, discountType, discountValue]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const changeAmount = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    return Math.max(0, paid - totalAmount);
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
