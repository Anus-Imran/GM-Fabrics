"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { ReceiptModal } from "../../../components/pos/receiptModal.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { Printer, Eye, RotateCcw } from "lucide-react";
import api from "../../../services/apiService.js";

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchSales = () => {
    return api
      .get("/sales")
      .then((res) => {
        if (res.data) setSales(res.data);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSales();
  }, []);



  const handlePrint = (sale) => {
    setSelectedSale(sale);
    setShowReceiptModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Bill Transactions History"
        description="View past sales bills, payment methods, line items, and reprint receipts."
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading sales history...</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Bill Number</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sales.map((sale) => {
                const totalReturned = sale.returns
                  ? sale.returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0)
                  : 0;
                const netAmount = Math.max(0, sale.totalAmount - totalReturned);

                return (
                  <tr key={sale.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {sale.saleNumber}
                    </td>
                    <td className="py-3 px-3 text-zinc-700 dark:text-zinc-300">
                      {sale.customer ? sale.customer.name : "Walk-in Customer"}
                    </td>
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                      {sale.user?.name || "Cashier"}
                    </td>
                    <td className="py-3 px-3 text-zinc-500">{formatDateTime(sale.createdAt)}</td>
                    <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                      <div>{formatCurrency(netAmount)}</div>
                      {totalReturned > 0 && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                          Orig: {formatCurrency(sale.totalAmount)} (-{formatCurrency(totalReturned)})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={sale.paymentMethod === "CREDIT" ? "warning" : "default"}>
                        {sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          sale.status === "COMPLETED"
                            ? "success"
                            : sale.status === "PARTIALLY_REFUNDED"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {sale.status === "PARTIALLY_REFUNDED"
                          ? "PARTIAL RETURN"
                          : sale.status === "REFUNDED"
                          ? "FULL RETURN"
                          : sale.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePrint(sale)}
                          className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-900 dark:text-zinc-100 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                        <Link
                          href={`/returns?saleNumber=${encodeURIComponent(sale.saleNumber)}`}
                          className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded text-[11px] font-semibold inline-flex items-center gap-1 border border-amber-200 dark:border-amber-800 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Return
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        sale={selectedSale}
      />
    </div>
  );
}
