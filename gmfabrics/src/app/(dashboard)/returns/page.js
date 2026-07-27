"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { RotateCcw, Search } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import api from "../../../services/apiService.js";

export default function ReturnsPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Return Form State
  const [selectedSaleNumber, setSelectedSaleNumber] = useState("");
  const [targetSale, setTargetSale] = useState(null);
  const [returnQtyMap, setReturnQtyMap] = useState({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales");
      if (res.data) setSales(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFindSale = async () => {
    setError("");
    if (!selectedSaleNumber) return;

    const found = sales.find(
      (s) => s.saleNumber.toLowerCase() === selectedSaleNumber.trim().toLowerCase()
    );
    if (!found) {
      setError("Bill number not found.");
      return;
    }

    try {
      const res = await api.get(`/sales/${found.id}`);
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

    setSubmitting(true);
    try {
      await api.post("/returns", {
        saleId: targetSale.id,
        items: returnItems,
        reason,
        refundMethod: targetSale.paymentMethod,
      });

      setShowModal(false);
      setTargetSale(null);
      setSelectedSaleNumber("");
      fetchSales();
    } catch (err) {
      setError(err.message || "Failed to process return.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Returns & Refunds"
        description="Process item returns, issue refunds, and restock inventory back into catalog."
        action={
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 font-bold">
            <RotateCcw className="w-4 h-4" /> Process New Return
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading sales returns...</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Bill Number</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Original Total</th>
                <th className="py-3 px-3">Return Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sales
                .filter((s) => s.status === "REFUNDED" || s.status === "PARTIALLY_REFUNDED")
                .map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {sale.saleNumber}
                    </td>
                    <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                      {sale.customer ? sale.customer.name : "Walk-in Customer"}
                    </td>
                    <td className="py-3 px-3 text-zinc-500">{formatDateTime(sale.createdAt)}</td>
                    <td className="py-3 px-3 font-bold">{formatCurrency(sale.totalAmount)}</td>
                    <td className="py-3 px-3">
                      <Badge variant="danger">{sale.status}</Badge>
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
              <Button type="button" onClick={handleFindSale} variant="secondary" className="mb-0.5">
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
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Select Return Quantity per Item
                </label>
                {targetSale.saleItems.map((si) => (
                  <div key={si.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{si.product.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        Bought: {si.quantity} {si.product.unit?.symbol} @ {formatCurrency(si.unitPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400">Return Qty:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={si.quantity}
                        value={returnQtyMap[si.id] || 0}
                        onChange={(e) =>
                          setReturnQtyMap({
                            ...returnQtyMap,
                            [si.id]: e.target.value,
                          })
                        }
                        className="w-16 text-center text-xs font-bold p-1 bg-white dark:bg-zinc-900 border rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Input
                label="Return Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Defective weave / Customer changed mind"
              />

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="w-1/3" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-2/3 font-bold">
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
