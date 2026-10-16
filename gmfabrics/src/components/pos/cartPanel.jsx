"use client";

import React, { forwardRef, useState } from "react";
import { Trash2, ShoppingBag, User, Tag, PauseCircle, ListRestart, Layers, X } from "lucide-react";
import { useCart } from "../../context/cartContext.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { Button } from "../common/button.jsx";
import { Tooltip } from "../common/tooltip.jsx";
import { CustomerPicker } from "./customerPicker.jsx";

export const CartPanel = forwardRef(
  ({ onOpenCheckout, onHold, onShowHeld, onClear, showDiscount, setShowDiscount, discountInputRef, onCloseMobile, className = "" }, customerRef) => {
    const {
      items,
      selectedCustomer,
      discountType,
      discountValue,
      subtotal,
      discountAmount,
      totalAmount,
      totalSavings,
      heldBills,
      updateQuantity,
      updateCustomDiscount,
      updateUnitPrice,
      removeFromCart,
      setSelectedCustomer,
      setDiscountType,
      setDiscountValue,
    } = useCart();

    // While a net-rate input is being edited we show the raw text, not the computed value.
    const [editingRate, setEditingRate] = useState({});

    return (
      <div className={`w-full lg:w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full shrink-0 ${className}`}>
        {/* Panel Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Current Cart</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip label="Hold this bill" shortcut="F8" side="bottom">
              <button
                onClick={onHold}
                disabled={items.length === 0}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                aria-label="Hold bill"
              >
                <PauseCircle className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip label="Held bills" shortcut="F9" side="bottom">
              <button
                onClick={onShowHeld}
                className="relative p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                aria-label="Show held bills"
              >
                <ListRestart className="w-4 h-4" />
                {heldBills.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                    {heldBills.length}
                  </span>
                )}
              </button>
            </Tooltip>
            {items.length > 0 && (
              <Tooltip label="Clear cart" shortcut="F10" side="bottom">
                <button onClick={onClear} className="text-xs text-red-600 hover:text-red-700 font-medium px-1.5 cursor-pointer">
                  Clear
                </button>
              </Tooltip>
            )}
            {onCloseMobile && (
              <button onClick={onCloseMobile} className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close cart">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Selector */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Customer / Khata Account</label>
          </div>
          <CustomerPicker ref={customerRef} value={selectedCustomer} onChange={setSelectedCustomer} />
        </div>

        {/* Line Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
              <ShoppingBag className="w-10 h-10 stroke-1 mb-2 text-zinc-300" />
              <p className="text-xs font-medium">Cart is empty</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Click products or scan a barcode to add to the bill</p>
            </div>
          ) : (
            items.map((item) => {
              const unit = item.product.unit?.symbol || "unit";
              const hasOverride = item.overridePrice !== null && item.overridePrice !== undefined;
              const rateText = editingRate[item.cartItemId] ?? String(item.unitPrice);

              return (
                <div
                  key={item.cartItemId}
                  className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{item.product.name}</h5>
                      <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                        <span>{item.product.category?.name}</span>
                        <span>•</span>
                        <span>Rate {formatCurrency(item.basePrice)}{item.mixedPrices ? " avg" : ""}</span>
                        {item.mixedPrices && (
                          <Tooltip
                            label={item.allocations.map((a) => `${a.quantity} @ ${a.listPrice}`).join("  +  ")}
                            side="bottom"
                          >
                            <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold cursor-help">
                              <Layers className="w-3 h-3" />
                              {item.lotCount} lots
                            </span>
                          </Tooltip>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-zinc-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Editable Inputs: Qty, Item Discount, and Net Sold Rate */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div>
                      <label className="block text-[9px] font-semibold text-zinc-500 uppercase mb-0.5">Qty ({unit})</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={item.product.unit?.allowDecimal !== false ? "any" : "1"}
                        min="0"
                        max={item.product.stockQuantity}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.cartItemId, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-1.5 py-1 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-900 text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">Disc / Unit</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={item.discountPerUnit || ""}
                        onChange={(e) => updateCustomDiscount(item.cartItemId, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-1.5 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded text-emerald-700 dark:text-emerald-300 focus:ring-1 focus:ring-emerald-500 text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-zinc-500 uppercase mb-0.5">Net Rate</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        value={rateText}
                        onChange={(e) => setEditingRate((r) => ({ ...r, [item.cartItemId]: e.target.value }))}
                        onFocus={(e) => {
                          setEditingRate((r) => ({ ...r, [item.cartItemId]: String(item.unitPrice) }));
                          e.target.select();
                        }}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== "" && parseFloat(v) !== item.unitPrice) updateUnitPrice(item.cartItemId, v);
                          setEditingRate((r) => {
                            const next = { ...r };
                            delete next[item.cartItemId];
                            return next;
                          });
                        }}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        className={`w-full px-1.5 py-1 text-xs font-bold bg-white dark:bg-zinc-900 border rounded text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-900 text-center ${
                          hasOverride ? "border-amber-400" : "border-zinc-200 dark:border-zinc-700"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50 text-xs">
                    <div>
                      {item.savings > 0 ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Saving {formatCurrency(item.savings)}
                        </span>
                      ) : item.unitPrice > item.basePrice ? (
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          Premium +{formatCurrency(item.unitPrice - item.basePrice)}/{unit}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                      )}
                      {hasOverride && (
                        <button
                          onClick={() => updateUnitPrice(item.cartItemId, "")}
                          className="ml-2 text-[10px] text-zinc-400 underline cursor-pointer"
                        >
                          reset rate
                        </button>
                      )}
                    </div>
                    <div className="text-right font-extrabold text-zinc-900 dark:text-zinc-100">{formatCurrency(item.subtotal)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Summary & Discount */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
          <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-zinc-900 dark:text-zinc-100 font-semibold">
                <span>Bill Discount</span>
                <span>- {formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div>
              {!showDiscount ? (
                <Tooltip label="Apply a bill discount" shortcut="Alt+D">
                  <button
                    onClick={() => setShowDiscount(true)}
                    className="text-[11px] text-zinc-800 dark:text-zinc-200 font-medium underline flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <Tag className="w-3 h-3" /> {discountAmount > 0 ? "Edit Discount" : "Apply Discount"}
                  </button>
                </Tooltip>
              ) : (
                <div className="pt-2 pb-1 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <select
                    value={discountType || "PERCENTAGE"}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="text-xs p-1 border rounded bg-white dark:bg-zinc-900 dark:border-zinc-700"
                  >
                    <option value="PERCENTAGE">% Disc</option>
                    <option value="FLAT">Flat PKR</option>
                  </select>
                  <input
                    ref={discountInputRef}
                    type="number"
                    min="0"
                    max={discountType === "FLAT" ? subtotal : 100}
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => {
                      if (!discountType) setDiscountType("PERCENTAGE");
                      const raw = parseFloat(e.target.value);
                      const cap = (discountType || "PERCENTAGE") === "PERCENTAGE" ? 100 : subtotal;
                      setDiscountValue(isNaN(raw) ? "" : Math.min(Math.max(0, raw), cap));
                    }}
                    onKeyDown={(e) => e.key === "Enter" && setShowDiscount(false)}
                    className="w-20 text-xs p-1 border rounded bg-white dark:bg-zinc-900 dark:border-zinc-700 font-bold"
                  />
                  <button onClick={() => setShowDiscount(false)} className="text-[10px] text-zinc-400 hover:text-zinc-600 cursor-pointer">
                    Done
                  </button>
                  {discountAmount > 0 && (
                    <button
                      onClick={() => {
                        setDiscountValue(0);
                        setDiscountType(null);
                        setShowDiscount(false);
                      }}
                      className="text-[10px] text-red-500 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>

            {totalSavings > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <span>Customer saves</span>
                <span>{formatCurrency(totalSavings)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <span>Payable Total</span>
              <span className="text-base font-extrabold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <Button
            onClick={onOpenCheckout}
            disabled={items.length === 0}
            size="lg"
            className="w-full font-bold shadow-md"
            tooltip="Open payment"
            shortcut="F4"
          >
            Proceed to Payment
          </Button>
        </div>
      </div>
    );
  }
);

CartPanel.displayName = "CartPanel";
