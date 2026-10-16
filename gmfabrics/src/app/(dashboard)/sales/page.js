"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { ReceiptModal } from "../../../components/pos/receiptModal.jsx";
import { Tooltip } from "../../../components/common/tooltip.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { promptText, showToastError, showToastSuccess } from "../../../utils/alerts.js";
import { shareSaleOnWhatsApp } from "../../../utils/printReceipt.js";
import { Printer, RotateCcw, Ban, MessageCircle, Loader2 } from "lucide-react";
import api from "../../../services/apiService.js";
import { useServerList } from "../../../hooks/useServerList.js";
import { useAuth } from "../../../context/authContext.jsx";

const STATUS_LABEL = {
  COMPLETED: { text: "COMPLETED", variant: "success" },
  PARTIALLY_REFUNDED: { text: "PARTIAL RETURN", variant: "amber" },
  REFUNDED: { text: "FULL RETURN", variant: "danger" },
  VOIDED: { text: "VOIDED", variant: "danger" },
  PENDING: { text: "PENDING", variant: "default" },
};

export default function SalesPage() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const list = useServerList("/sales", { params: { status, paymentMethod } });

  const [selectedSale, setSelectedSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // List rows are lean; the full bill (items + receipt) is fetched on demand.
  const loadFullSale = async (sale) => {
    setBusyId(sale.id);
    try {
      const res = await api.get(`/sales/${sale.id}`);
      return res.data;
    } catch (err) {
      showToastError(err.message);
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const handlePrint = async (sale) => {
    const full = await loadFullSale(sale);
    if (full) {
      setSelectedSale(full);
      setShowReceiptModal(true);
    }
  };

  const handleWhatsApp = async (sale) => {
    const full = await loadFullSale(sale);
    if (full) shareSaleOnWhatsApp(full);
  };

  const handleVoid = async (sale) => {
    const reason = await promptText(`Void bill ${sale.saleNumber}?`, {
      label: "Stock goes back to the shelf and any khata amount is reversed. Reason:",
      placeholder: "e.g. Wrong items billed",
      confirmButtonText: "Void Bill",
    });
    if (!reason) return;
    setBusyId(sale.id);
    try {
      await api.post(`/sales/${sale.id}/void`, { reason });
      showToastSuccess(`Bill ${sale.saleNumber} voided`);
      list.reload();
    } catch (err) {
      showToastError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: "saleNumber",
      label: "Bill Number",
      render: (sale) => (
        <div>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{sale.saleNumber}</span>
          <p className="text-[10px] text-zinc-400">{sale._count?.saleItems || 0} line(s)</p>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: false,
      exportValue: (s) => s.customer?.name || "Walk-in",
      render: (sale) => (
        <div>
          <p className="font-semibold">{sale.customer?.name || "Walk-in Customer"}</p>
          {sale.customer?.phone && <p className="text-[10px] text-zinc-400 font-mono">{sale.customer.phone}</p>}
        </div>
      ),
    },
    {
      key: "user",
      label: "Cashier",
      sortable: false,
      exportValue: (s) => s.user?.name,
      render: (sale) => sale.user?.name || "Cashier",
    },
    {
      key: "createdAt",
      label: "Date",
      render: (sale) => formatDateTime(sale.createdAt),
    },
    {
      key: "totalAmount",
      label: "Net Amount",
      render: (sale) => (
        <div>
          <div className={`font-bold ${sale.status === "VOIDED" ? "line-through text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>
            {formatCurrency(Math.max(0, sale.totalAmount - (sale.refundedAmount || 0)))}
          </div>
          {sale.refundedAmount > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
              Orig: {formatCurrency(sale.totalAmount)} (-{formatCurrency(sale.refundedAmount)})
            </div>
          )}
          {sale.creditAmount > 0 && <div className="text-[10px] text-amber-600 font-semibold">Khata: {formatCurrency(sale.creditAmount)}</div>}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment",
      render: (sale) => (
        <Badge variant={sale.paymentMethod === "CREDIT" ? "amber" : sale.paymentMethod === "CARD" ? "info" : "default"}>
          {sale.paymentMethod === "CREDIT" ? "KHATA" : sale.paymentMethod}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (sale) => {
        const s = STATUS_LABEL[sale.status] || STATUS_LABEL.PENDING;
        return (
          <Tooltip label={sale.status === "VOIDED" ? sale.voidReason || "Voided" : null}>
            <Badge variant={s.variant}>{s.text}</Badge>
          </Tooltip>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      cellClassName: "text-right",
      render: (sale) => (
        <div className="flex items-center justify-end gap-1.5">
          {busyId === sale.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
          <Tooltip label="View / reprint receipt">
            <button
              onClick={() => handlePrint(sale)}
              disabled={busyId === sale.id}
              className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3 h-3" /> Print
            </button>
          </Tooltip>
          <Tooltip label="Send on WhatsApp">
            <button
              onClick={() => handleWhatsApp(sale)}
              disabled={busyId === sale.id}
              className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              aria-label="Send on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          {sale.status !== "VOIDED" && sale.status !== "REFUNDED" && (
            <Link
              href={`/returns?saleNumber=${encodeURIComponent(sale.saleNumber)}`}
              className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded text-[11px] font-semibold inline-flex items-center gap-1 border border-amber-200 dark:border-amber-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Return
            </Link>
          )}
          {isAdmin && sale.status !== "VOIDED" && (sale._count?.returns || 0) === 0 && (
            <Tooltip label="Void bill (admin)">
              <button
                onClick={() => handleVoid(sale)}
                disabled={busyId === sale.id}
                className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                aria-label="Void bill"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  const selectClass =
    "text-xs py-2 px-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold cursor-pointer focus:outline-none";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Bill Transactions History"
        description="Search bills by number, customer or phone. Reprint receipts, share on WhatsApp, process returns."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Bills found</p>
          <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{list.total.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Total billed</p>
          <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(list.summary?.totalAmount || 0)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Discounts given</p>
          <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(list.summary?.totalDiscount || 0)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIALLY_REFUNDED">Partial return</option>
            <option value="REFUNDED">Full return</option>
            <option value="VOIDED">Voided</option>
          </select>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectClass} aria-label="Filter by payment">
            <option value="">All payments</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Khata</option>
          </select>
        </div>
      </div>

      <Card>
        {list.error && <p className="text-xs text-red-600 mb-3">{list.error}</p>}
        <DataTable
          title="Sales_History"
          columns={columns}
          data={list.items}
          serverMode
          totalCount={list.total}
          onQueryChange={list.setQuery}
          loading={list.loading}
          dateKey="createdAt"
          enableSelection={false}
          enableDateFilter={true}
          defaultPageSize={25}
          rowClassName={(s) => (s.status === "VOIDED" ? "opacity-60" : "")}
        />
      </Card>

      <ReceiptModal isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)} sale={selectedSale} />
    </div>
  );
}
