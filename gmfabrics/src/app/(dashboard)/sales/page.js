"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { ReceiptModal } from "../../../components/pos/receiptModal.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { Printer, RotateCcw } from "lucide-react";
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

  const columns = [
    {
      key: "saleNumber",
      label: "Bill Number",
      render: (sale) => (
        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{sale.saleNumber}</span>
      ),
    },
    {
      key: "customerName",
      label: "Customer",
      render: (sale) => sale.customerName,
    },
    {
      key: "cashierName",
      label: "Cashier",
      render: (sale) => sale.cashierName,
    },
    {
      key: "createdAt",
      label: "Date",
      render: (sale) => formatDateTime(sale.createdAt),
    },
    {
      key: "netAmount",
      label: "Net Amount",
      render: (sale) => (
        <div>
          <div className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(sale.netAmount)}</div>
          {sale.totalReturned > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
              Orig: {formatCurrency(sale.totalAmount)} (-{formatCurrency(sale.totalReturned)})
            </div>
          )}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment",
      render: (sale) => (
        <Badge variant={sale.paymentMethod === "CREDIT" ? "warning" : "default"}>{sale.paymentMethod}</Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (sale) => (
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
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      cellClassName: "text-right",
      render: (sale) => (
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
      ),
    },
  ];

  const formattedSales = sales.map((s) => {
    const totalReturned = s.returns ? s.returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0) : 0;
    return {
      ...s,
      customerName: s.customer ? s.customer.name : "Walk-in Customer",
      cashierName: s.user?.name || "Cashier",
      totalReturned,
      netAmount: Math.max(0, s.totalAmount - totalReturned),
    };
  });

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
          <DataTable
            title="Sales_History"
            columns={columns}
            data={formattedSales}
            searchKeys={["saleNumber", "customerName", "cashierName", "paymentMethod", "status"]}
            dateKey="createdAt"
            enableSelection={false}
            enableDateFilter={true}
          />
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
