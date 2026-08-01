"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { RotateCcw, Search, Trash2, Tag, ShieldAlert, PackageCheck, Scissors } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { showToastSuccess, showToastError, confirmAction } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";

function ReturnsContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("saleNumber") || searchParams.get("billNumber") || searchParams.get("saleId") || "";

  const [returns, setReturns] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(Boolean(urlParam));

  // Return Form State
  const [selectedSaleNumber, setSelectedSaleNumber] = useState(urlParam);
  const [targetSale, setTargetSale] = useState(null);
  const [returnQtyMap, setReturnQtyMap] = useState({});
  const [itemConditions, setItemConditions] = useState({}); // { [saleItemId]: "RESTOCK" | "DAMAGED_WASTE" }
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchReturns = () => {
    return api
      .get("/returns")
      .then((res) => {
        if (res.data) setReturns(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch returns:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchSales = () => {
    return api
      .get("/sales")
      .then((res) => {
        if (res.data) {
          setSalesList(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch sales:", err);
      });
  };

  const autoLookupSale = (term) => {
    if (!term) return Promise.resolve();

    return api
      .get(`/sales/${encodeURIComponent(term.trim())}`)
      .then((res) => {
        if (res && res.data) {
          setError("");
          setTargetSale(res.data);
          const initialQtyMap = {};
          const initialConditionMap = {};
          res.data.saleItems.forEach((si) => {
            initialQtyMap[si.id] = 0;
            initialConditionMap[si.id] = "RESTOCK";
          });
          setReturnQtyMap(initialQtyMap);
          setItemConditions(initialConditionMap);
        }
      })
      .catch((err) => {
        console.error("Auto lookup error:", err);
        setError(err.message || "Bill number not found.");
      });
  };

  useEffect(() => {
    fetchReturns();
    fetchSales();
    if (urlParam) {
      autoLookupSale(urlParam);
    }
  }, [urlParam]);

  const handleFindSale = async () => {
    setError("");
    if (!selectedSaleNumber) return;

    const term = selectedSaleNumber.trim();
    try {
      const res = await api.get(`/sales/${encodeURIComponent(term)}`);
      if (res.data) {
        setTargetSale(res.data);
        const initialQtyMap = {};
        const initialConditionMap = {};
        res.data.saleItems.forEach((si) => {
          initialQtyMap[si.id] = 0;
          initialConditionMap[si.id] = "RESTOCK";
        });
        setReturnQtyMap(initialQtyMap);
        setItemConditions(initialConditionMap);
      }
    } catch (err) {
      setError(err.message || "Failed to load sale details.");
    }
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    setError("");

    if (!targetSale) return;

    const returnItems = Object.entries(returnQtyMap)
      .map(([saleItemId, qty]) => ({
        saleItemId: parseInt(saleItemId, 10),
        quantity: parseFloat(qty) || 0,
        condition: itemConditions[saleItemId] || "RESTOCK",
      }))
      .filter((i) => i.quantity > 0);

    if (returnItems.length === 0) {
      setError("Please specify quantity for at least one item to return.");
      return;
    }

    const isKhataSale = targetSale.paymentMethod === "CREDIT" && targetSale.customerId;
    const confirmTitle = isKhataSale ? "Confirm Khata Return Ledger Credit?" : "Confirm Return & Restock?";
    const confirmMessage = isKhataSale
      ? `Process return for ${returnItems.length} item(s)? The refund amount will automatically credit back to Customer's Khata Debt ledger.`
      : `Process return for ${returnItems.length} item(s) and adjust inventory stock?`;

    const isConfirmed = await confirmAction(confirmTitle, confirmMessage, "Yes, Process Return");
    if (!isConfirmed) return;

    setSubmitting(true);
    try {
      await api.post("/returns", {
        saleId: targetSale.id,
        items: returnItems,
        reason,
        refundMethod: isKhataSale ? "CREDIT" : targetSale.paymentMethod,
      });

      showToastSuccess("Return processed successfully & records updated!");
      setShowModal(false);
      setTargetSale(null);
      setSelectedSaleNumber("");
      fetchReturns();
      fetchSales();
    } catch (err) {
      setError(err.message || "Failed to process return.");
      showToastError(err.message || "Failed to process return.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReturn = async (returnId) => {
    const isConfirmed = await confirmAction(
      "Kya aap waqai is return ko delete karna chahte hain?",
      "Is return ko delete karne par RESTOCKED stock inventory minus kar di jayegi aur Customer Khata credit revert ho jayegi.",
      "Haan, Delete Karein"
    );

    if (!isConfirmed) return;

    try {
      await api.delete(`/returns/${returnId}`);
      showToastSuccess("Return deleted and stock/khata ledger adjusted successfully!");
      fetchReturns();
      fetchSales();
    } catch (err) {
      showToastError(err.message || "Failed to delete return record.");
    }
  };

  // Calculate estimated total refund for modal items using actual effective discounted unit price
  const discountRatio = targetSale && targetSale.subtotal > 0 ? targetSale.totalAmount / targetSale.subtotal : 1;
  const calculatedTotalRefund = targetSale
    ? targetSale.saleItems.reduce((sum, si) => {
        const qty = parseFloat(returnQtyMap[si.id]) || 0;
        const effectiveUnitPrice = si.unitPrice * discountRatio;
        return sum + Math.round(qty * effectiveUnitPrice);
      }, 0)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Returns & Refunds"
        description="Process fabric returns, write off waste cut-pieces, credit Khata debt, and restock inventory."
        action={
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 font-bold cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Process New Return
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading sales returns...</div>
        ) : returns.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">No return records found.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Return ID</th>
                <th className="py-3 px-3">Bill Number</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Items Returned & Condition</th>
                <th className="py-3 px-3">Refund Amount</th>
                <th className="py-3 px-3">Refund Method</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    #{ret.id}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    {ret.sale?.saleNumber || `Sale #${ret.saleId}`}
                  </td>
                  <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                    {ret.sale?.customer ? ret.sale.customer.name : "Walk-in Customer"}
                  </td>
                  <td className="py-3 px-3 text-zinc-500">{formatDateTime(ret.createdAt)}</td>
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      {ret.returnItems?.map((ri) => (
                        <div key={ri.id} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
                          <span>• {ri.product?.name}: <span className="font-semibold">{ri.quantity} {ri.product?.unit?.symbol}</span> (@ {formatCurrency(ri.quantity > 0 ? ri.refundAmount / ri.quantity : 0)})</span>
                          {ri.condition === "DAMAGED_WASTE" ? (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded text-[9px] font-bold inline-flex items-center gap-0.5">
                              <Scissors className="w-2.5 h-2.5" /> Waste / Scrap
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded text-[9px] font-bold inline-flex items-center gap-0.5">
                              <PackageCheck className="w-2.5 h-2.5" /> Restocked
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(ret.refundAmount)}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={ret.refundMethod === "CREDIT" ? "warning" : "default"}>
                      {ret.refundMethod === "CREDIT" ? "KHATA CREDIT" : ret.refundMethod}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-zinc-500 max-w-[150px] truncate">
                    {ret.reason || "-"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteReturn(ret.id)}
                      title="Delete Return Record"
                      className="p-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 rounded border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Return Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Process Sale Return" maxWidth="max-w-xl">
        <form onSubmit={handleProcessReturn} className="space-y-4">
          {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

          {/* Search Sale */}
          <div className="flex gap-2">
            <Input
              label="Original Bill Number *"
              value={selectedSaleNumber}
              onChange={(e) => setSelectedSaleNumber(e.target.value)}
              placeholder="e.g. GM-2026-00001"
            />
            <div className="flex items-end">
              <Button type="button" onClick={handleFindSale} variant="secondary" className="mb-0.5 cursor-pointer">
                <Search className="w-4 h-4" /> Find Bill
              </Button>
            </div>
          </div>

          {targetSale && (
            <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Bill Date:</span>
                  <span>{formatDateTime(targetSale.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Customer:</span>
                  <span className="font-bold">{targetSale.customer?.name || "Walk-in"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payment Type:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{targetSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Original Total:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(targetSale.totalAmount)}</span>
                </div>
              </div>

              {/* Khata Debt Ledger Protection Notice */}
              {targetSale.paymentMethod === "CREDIT" && targetSale.customer && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Khata Credit Ledger Protection
                  </div>
                  <p className="text-amber-700 dark:text-amber-300 text-[11px]">
                    This bill was charged to Khata Credit (Current Debt: <span className="font-bold">{formatCurrency(targetSale.customer.outstandingBalance || 0)}</span>).
                    Refunds will automatically credit back to the Customer&apos;s Khata debt ledger to prevent cash drawer disconnect.
                  </p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select Return Quantity & Restock Condition per Item
                </label>
                {targetSale.saleItems.map((si) => (
                  <div key={si.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2 text-xs bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{si.product.name}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 flex-wrap">
                          <Tag className="w-3 h-3" /> Effective Sold Rate: <span className="font-bold">{formatCurrency(Math.round(si.unitPrice * discountRatio))}</span> / {si.product.unit?.symbol || "unit"}
                          {discountRatio < 1 && (
                            <span className="text-[10px] text-zinc-400 line-through font-normal ml-1">
                              ({formatCurrency(si.unitPrice)})
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Bought Qty: {si.quantity} {si.product.unit?.symbol}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">Return Qty:</span>
                        <input
                          type="number"
                          step={si.product.unit?.allowDecimal !== false ? "0.01" : "1"}
                          min="0"
                          max={si.quantity}
                          value={returnQtyMap[si.id] || 0}
                          onChange={(e) =>
                            setReturnQtyMap({
                              ...returnQtyMap,
                              [si.id]: e.target.value,
                            })
                          }
                          className="w-16 text-center text-xs font-bold p-1 bg-white dark:bg-zinc-900 border rounded focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Restock vs Damaged Condition Selector */}
                    {parseFloat(returnQtyMap[si.id]) > 0 && (
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 font-medium">Restock Condition:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setItemConditions({ ...itemConditions, [si.id]: "RESTOCK" })}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              itemConditions[si.id] !== "DAMAGED_WASTE"
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            <PackageCheck className="w-3 h-3" /> Restock Roll
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemConditions({ ...itemConditions, [si.id]: "DAMAGED_WASTE" })}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              itemConditions[si.id] === "DAMAGED_WASTE"
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            <Scissors className="w-3 h-3" /> Scrap / Damaged
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {calculatedTotalRefund > 0 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex justify-between items-center text-xs">
                  <span className="font-semibold text-amber-800 dark:text-amber-200">Total Calculated Refund:</span>
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">{formatCurrency(calculatedTotalRefund)}</span>
                </div>
              )}

              <Input
                label="Return Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Cut piece unusable / Weave defect / Customer changed mind"
              />

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="w-1/3 cursor-pointer" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-2/3 font-bold cursor-pointer">
                  {submitting ? "Processing..." : "Confirm Return & Restock"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-xs text-zinc-400">Loading returns page...</div>}>
      <ReturnsContent />
    </Suspense>
  );
}
