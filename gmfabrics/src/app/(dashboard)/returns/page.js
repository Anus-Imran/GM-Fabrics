"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { RotateCcw, Search, Trash2, Tag } from "lucide-react";
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
      .get("/sales")
      .then((allSales) => {
        setError("");
        let saleIdToFetch = null;
        if (allSales.data) {
          setSalesList(allSales.data);
          const match = allSales.data.find(
            (s) => s.saleNumber.toLowerCase() === term.trim().toLowerCase() || String(s.id) === String(term)
          );
          if (match) saleIdToFetch = match.id;
        }

        if (!saleIdToFetch && !isNaN(parseInt(term, 10))) {
          saleIdToFetch = parseInt(term, 10);
        }

        if (saleIdToFetch) {
          return api.get(`/sales/${saleIdToFetch}`);
        }
      })
      .then((res) => {
        if (res && res.data) {
          setTargetSale(res.data);
          const initialMap = {};
          res.data.saleItems.forEach((si) => {
            initialMap[si.id] = 0;
          });
          setReturnQtyMap(initialMap);
        }
      })
      .catch((err) => {
        console.error("Auto lookup error:", err);
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
    const found = salesList.find(
      (s) => s.saleNumber.toLowerCase() === term.toLowerCase() || String(s.id) === String(term)
    );

    let saleIdToFetch = found ? found.id : null;

    if (!found) {
      try {
        const allSales = await api.get("/sales");
        if (allSales.data) {
          setSalesList(allSales.data);
          const match = allSales.data.find(
            (s) => s.saleNumber.toLowerCase() === term.toLowerCase() || String(s.id) === String(term)
          );
          if (match) saleIdToFetch = match.id;
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (!saleIdToFetch) {
      setError("Bill number not found.");
      return;
    }

    try {
      const res = await api.get(`/sales/${saleIdToFetch}`);
      if (res.data) {
        setTargetSale(res.data);
        const initialMap = {};
        res.data.saleItems.forEach((si) => {
          initialMap[si.id] = 0;
        });
        setReturnQtyMap(initialMap);
      }
    } catch (err) {
      setError("Failed to load sale details.");
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
      }))
      .filter((i) => i.quantity > 0);

    if (returnItems.length === 0) {
      setError("Please specify quantity for at least one item to return.");
      return;
    }

    const isConfirmed = await confirmAction(
      "Confirm Return & Restock?",
      `Process return for ${returnItems.length} item(s) and restock inventory?`,
      "Yes, Process Return"
    );
    if (!isConfirmed) return;

    setSubmitting(true);
    try {
      await api.post("/returns", {
        saleId: targetSale.id,
        items: returnItems,
        reason,
        refundMethod: targetSale.paymentMethod,
      });

      showToastSuccess("Return processed successfully & stock inventory restocked!");
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
      "Is return ko delete karne par restocked inventory stock wapas adjust (minus) kar diya jayega.",
      "Haan, Delete Karein"
    );

    if (!isConfirmed) return;

    try {
      await api.delete(`/returns/${returnId}`);
      showToastSuccess("Return deleted and stock adjusted successfully!");
      fetchReturns();
      fetchSales();
    } catch (err) {
      showToastError(err.message || "Failed to delete return record.");
    }
  };

  // Calculate estimated total refund for modal items using actual sold price (unitPrice)
  const calculatedTotalRefund = targetSale
    ? targetSale.saleItems.reduce((sum, si) => {
        const qty = parseFloat(returnQtyMap[si.id]) || 0;
        // Uses sold unit price (unitPrice e.g. 1900), not product base list price (salePrice e.g. 2200)
        return sum + Math.round(qty * si.unitPrice);
      }, 0)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Returns & Refunds"
        description="Process item returns, issue refunds, restock inventory, and manage return records."
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
                <th className="py-3 px-3">Items Returned</th>
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
                    <div className="space-y-0.5">
                      {ret.returnItems?.map((ri) => (
                        <div key={ri.id} className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          • {ri.product?.name}: <span className="font-semibold">{ri.quantity} {ri.product?.unit?.symbol}</span> (@ {formatCurrency(ri.quantity > 0 ? ri.refundAmount / ri.quantity : 0)})
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(ret.refundAmount)}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={ret.refundMethod === "CREDIT" ? "warning" : "default"}>
                      {ret.refundMethod}
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Process Sale Return" maxWidth="max-w-lg">
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
                  <span className="text-zinc-500">Original Total:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(targetSale.totalAmount)}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select Return Quantity per Item
                </label>
                {targetSale.saleItems.map((si) => (
                  <div key={si.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{si.product.name}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Actual Sold Price: <span className="font-bold">{formatCurrency(si.unitPrice)}</span> / {si.product.unit?.symbol || "unit"}
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
                placeholder="e.g. Defective weave / Customer changed mind"
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
