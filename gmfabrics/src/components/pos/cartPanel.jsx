"use client";

import React, { useState } from "react";
import { Trash2, ShoppingBag, User, Tag, Layers } from "lucide-react";
import { useCart } from "../../context/cartContext.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Button } from "../common/button.jsx";

export const CartPanel = ({ customers = [], onOpenCheckout }) => {
  const {
    items,
    selectedCustomer,
    discountType,
    discountValue,
    subtotal,
    discountAmount,
    totalAmount,
    updateQuantity,
    updateCustomDiscount,
    updateUnitPrice,
    removeFromCart,
    clearCart,
    setSelectedCustomer,
    setDiscountType,
    setDiscountValue,
  } = useCart();

  const [showDiscountInput, setShowDiscountInput] = useState(false);

  return (
    <div className="w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full shrink-0">
      {/* Panel Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Current Cart</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
            {items.length}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Customer Selector */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
            Customer / Khata Account
          </label>
        </div>
        <select
          value={selectedCustomer?.id || ""}
          onChange={(e) => {
            const cust = customers.find((c) => c.id === parseInt(e.target.value, 10));
            setSelectedCustomer(cust || null);
          }}
          className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          <option value="">Walk-in Customer (Standard Cash)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.phone ? `(${c.phone})` : ""} — Khata: PKR {c.outstandingBalance}
            </option>
          ))}
        </select>
      </div>

      {/* Line Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
            <ShoppingBag className="w-10 h-10 stroke-1 mb-2 text-zinc-300" />
            <p className="text-xs font-medium">Cart is empty</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Click products to add to current bill</p>
          </div>
        ) : (
          items.map((item) => {
            const hasCustomDiscount = item.customDiscount > 0;

            return (
              <div
                key={item.cartItemId}
                className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-2 relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight flex items-center gap-1.5">
                      <span>{item.product.name}</span>
                      {item.batch && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                          {item.batchLabel}
                        </span>
                      )}
                    </h5>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {item.product.category?.name} • {item.batch ? `Batch Rate: ${formatCurrency(item.basePrice)}` : `Catalog Rate: ${formatCurrency(item.basePrice)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.cartItemId)}
                    className="text-zinc-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Editable Inputs: Qty, Item Discount, and Net Sold Rate */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* Quantity Input */}
                  <div>
                    <label className="block text-[9px] font-semibold text-zinc-500 uppercase mb-0.5">
                      Qty ({item.product.unit?.symbol || "unit"})
                    </label>
                    <input
                      type="number"
                      step={item.product.unit?.allowDecimal !== false ? "0.01" : "1"}
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.cartItemId, e.target.value)}
                      className="w-full px-1.5 py-1 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-900 text-center"
                    />
                  </div>

                  {/* Item Discount (PKR/unit) Input */}
                  <div>
                    <label className="block text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">
                      Disc / Unit (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.customDiscount || ""}
                      onChange={(e) => updateCustomDiscount(item.cartItemId, e.target.value)}
                      className="w-full px-1.5 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded text-emerald-700 dark:text-emerald-300 focus:ring-1 focus:ring-emerald-500 text-center"
                    />
                  </div>

                  {/* Net Sold Rate (PKR/unit) Input */}
                  <div>
                    <label className="block text-[9px] font-semibold text-zinc-500 uppercase mb-0.5">
                      Net Rate (PKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateUnitPrice(item.cartItemId, e.target.value)}
                      className="w-full px-1.5 py-1 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-900 text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50 text-xs">
                  <div>
                    {hasCustomDiscount ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Item Disc Applied: -{formatCurrency(item.customDiscount)}/unit
                      </span>
                    ) : item.unitPrice > item.basePrice ? (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Premium Rate: +{formatCurrency(item.unitPrice - item.basePrice)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">Rate: {formatCurrency(item.basePrice)}</span>
                    )}
                  </div>
                  <div className="text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Discount */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
        {/* Subtotal & Discount toggle */}
        <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-zinc-900 dark:text-zinc-100 font-semibold">
              <span>Discount</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          {/* Discount Trigger / Inputs */}
          <div>
            {!showDiscountInput ? (
              <button
                onClick={() => setShowDiscountInput(true)}
                className="text-[11px] text-zinc-800 dark:text-zinc-200 font-medium underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                <Tag className="w-3 h-3" /> Apply Discount
              </button>
            ) : (
              <div className="pt-2 pb-1 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                <select
                  value={discountType || "PERCENTAGE"}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="text-xs p-1 border rounded bg-white dark:bg-zinc-900"
                >
                  <option value="PERCENTAGE">% Disc</option>
                  <option value="FLAT">Flat PKR</option>
                </select>
                <input
                  type="number"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-20 text-xs p-1 border rounded bg-white dark:bg-zinc-900 font-bold"
                />
                <button
                  onClick={() => setShowDiscountInput(false)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <span>Payable Total</span>
            <span className="text-base font-extrabold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          onClick={onOpenCheckout}
          disabled={items.length === 0}
          size="lg"
          className="w-full font-bold shadow-md cursor-pointer"
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
};
