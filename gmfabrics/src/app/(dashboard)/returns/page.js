"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { RotateCcw, Search, Trash2, Tag, ShieldAlert, PackageCheck, Scissors, Clock } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { showToastSuccess, showToastError, confirmAction } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { useServerList } from "../../../hooks/useServerList.js";
import { useHotkeys } from "../../../hooks/useHotkeys.js";
import { useAuth } from "../../../context/authContext.jsx";

const RETURN_WINDOW_DAYS = parseInt(process.env.NEXT_PUBLIC_RETURN_WINDOW_DAYS || "7", 10);
const round2 = (v) => Math.round((Number(v) || 0) * 100 + Number.EPSILON) / 100;

function ReturnsContent() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("saleNumber") || searchParams.get("billNumber") || searchParams.get("saleId") || "";

  const list = useServerList("/returns");
  const [showModal, setShowModal] = useState(Boolean(urlParam));

  const [selectedSaleNumber, setSelectedSaleNumber] = useState(urlParam);
  const [targetSale, setTargetSale] = useState(null);
  const [returnQtyMap, setReturnQtyMap] = useState({});
  const [itemConditions, setItemConditions] = useState({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [overrideWindow, setOverrideWindow] = useState(false);
  const [finding, setFinding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setTargetSale(null);
    setSelectedSaleNumber("");
    setReturnQtyMap({});
    setItemConditions({});
    setReason("");
    setOverrideWindow(false);
    setError("");
  };

  const lookupSale = async (term) => {
    if (!term?.trim()) return;
    setError("");
    setFinding(true);
    try {
      const res = await api.get(`/sales/${encodeURIComponent(term.trim())}`);
      const sale = res.data;
      setTargetSale(sale);
      const qty = {};
      const cond = {};
      sale.saleItems.forEach((si) => {
        qty[si.id] = "";
        cond[si.id] = "RESTOCK";
      });
      setReturnQtyMap(qty);
      setItemConditions(cond);
      setRefundMethod(sale.paymentMethod === "CARD" ? "CARD" : "CASH");
      setOverrideWindow(false);
    } catch (err) {
      setTargetSale(null);
      setError(err.message || "Bill number not found.");
    } finally {
      setFinding(false);
    }
  };

  useEffect(() => {
    if (urlParam) lookupSale(urlParam);
  }, [urlParam]);

  useHotkeys({ "Alt+Shift+N": () => setShowModal(true) }, { enabled: !showModal });

  // Already-returned quantity per sale item.
  const returnedQty = {};
  (targetSale?.returns || []).forEach((r) =>
    (r.returnItems || []).forEach((ri) => {
      returnedQty[ri.saleItemId] = (returnedQty[ri.saleItemId] || 0) + ri.quantity;
    })
  );

  const isKhataSale = !!targetSale && (targetSale.creditAmount > 0 || targetSale.paymentMethod === "CREDIT") && !!targetSale.customerId;
  const ageDays = targetSale ? (Date.now() - new Date(targetSale.createdAt).getTime()) / 86400000 : 0;
  const outsideWindow = targetSale && RETURN_WINDOW_DAYS > 0 && ageDays > RETURN_WINDOW_DAYS;
  const discountRatio = targetSale && targetSale.subtotal > 0 ? targetSale.totalAmount / targetSale.subtotal : 1;
  const alreadyRefunded = (targetSale?.returns || []).reduce((s, r) => s + r.refundAmount, 0);

  const estimatedRefund = targetSale
    ? Math.min(
        round2(targetSale.totalAmount - alreadyRefunded),
        round2(
          targetSale.saleItems.reduce((sum, si) => sum + round2((parseFloat(returnQtyMap[si.id]) || 0) * si.unitPrice * discountRatio), 0)
        )
      )
    : 0;

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
      setError("Enter a return quantity for at least one item.");
      return;
    }
    for (const ri of returnItems) {
      const si = targetSale.saleItems.find((s) => s.id === ri.saleItemId);
      const max = si.quantity - (returnedQty[si.id] || 0);
      if (ri.quantity > max + 0.0005) {
        setError(`"${si.product.name}": only ${max} can still be returned.`);
        return;
      }
      if (si.product.unit?.allowDecimal === false && !Number.isInteger(ri.quantity)) {
        setError(`"${si.product.name}" is returned in whole units only.`);
        return;
      }
    }
    if (outsideWindow && !(isAdmin && overrideWindow)) {
      setError(`This bill is older than ${RETURN_WINDOW_DAYS} days.${isAdmin ? " Tick the override box to continue." : " An admin must approve this return."}`);
      return;
    }

    const confirmed = await confirmAction(
      isKhataSale ? "Refund to customer's khata?" : "Confirm return & refund?",
      `${returnItems.length} item(s), refund about ${formatCurrency(estimatedRefund)}${isKhataSale ? " — the customer's khata balance will be reduced." : ` by ${refundMethod}.`}`,
      "Yes, Process Return"
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await api.post("/returns", {
        saleId: targetSale.id,
        items: returnItems,
        reason: reason.trim() || null,
        refundMethod: isKhataSale ? "CREDIT" : refundMethod,
        overrideWindow: isAdmin && overrideWindow,
      });
      showToastSuccess(`Return processed — refund ${formatCurrency(res.data?.refundAmount || 0)}`);
      setShowModal(false);
      resetForm();
      list.reload();
    } catch (err) {
      setError(err.message || "Failed to process return.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReturn = async (returnId) => {
    const ok = await confirmAction(
      "Delete this return?",
      "Restocked quantity will be removed from stock again and any khata credit will be reversed.",
      "Yes, Delete"
    );
    if (!ok) return;
    try {
      await api.delete(`/returns/${returnId}`);
      showToastSuccess("Return deleted and stock / khata adjusted.");
      list.reload();
    } catch (err) {
      showToastError(err.message || "Failed to delete return record.");
    }
  };

  const columns = [
    { key: "id", label: "Return ID", render: (ret) => <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">#{ret.id}</span> },
    {
      key: "saleNumber",
      label: "Bill Number",
      sortable: false,
      exportValue: (r) => r.sale?.saleNumber,
      render: (ret) => <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{ret.sale?.saleNumber || `Sale #${ret.saleId}`}</span>,
    },
    {
      key: "customer",
      label: "Customer",
      sortable: false,
      exportValue: (r) => r.sale?.customer?.name || "Walk-in",
      render: (ret) => ret.sale?.customer?.name || "Walk-in Customer",
    },
    { key: "createdAt", label: "Date", sortable: false, render: (ret) => formatDateTime(ret.createdAt) },
    {
      key: "itemsSummary",
      label: "Items Returned & Condition",
      sortable: false,
      exportValue: (r) => (r.returnItems || []).map((ri) => `${ri.product?.name} x${ri.quantity}`).join("; "),
      render: (ret) => (
        <div className="space-y-1">
          {ret.returnItems?.map((ri) => (
            <div key={ri.id} className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
              <span>
                • {ri.product?.name}: <span className="font-semibold">{ri.quantity} {ri.product?.unit?.symbol}</span> (
                {formatCurrency(ri.refundAmount)})
              </span>
              {ri.condition === "DAMAGED_WASTE" ? (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded text-[9px] font-bold inline-flex items-center gap-0.5">
                  <Scissors className="w-2.5 h-2.5" /> Waste
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded text-[9px] font-bold inline-flex items-center gap-0.5">
                  <PackageCheck className="w-2.5 h-2.5" /> Restocked
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "refundAmount",
      label: "Refund",
      sortable: false,
      render: (ret) => <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(ret.refundAmount)}</span>,
    },
    {
      key: "refundMethod",
      label: "Method",
      sortable: false,
      render: (ret) => (
        <Badge variant={ret.refundMethod === "CREDIT" ? "amber" : "default"}>{ret.refundMethod === "CREDIT" ? "KHATA" : ret.refundMethod}</Badge>
      ),
    },
    { key: "user", label: "By", sortable: false, exportValue: (r) => r.user?.name, render: (ret) => ret.user?.name || "—" },
    { key: "reason", label: "Reason", sortable: false, render: (ret) => <span className="text-zinc-500 max-w-[150px] truncate block">{ret.reason || "-"}</span> },
    ...(isAdmin
      ? [
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            cellClassName: "text-right",
            render: (ret) => (
              <button
                onClick={() => handleDeleteReturn(ret.id)}
                title="Delete return (admin)"
                className="p-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 rounded border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Returns & Refunds"
        description={`Process fabric returns within ${RETURN_WINDOW_DAYS} days, write off damaged pieces, credit khata and restock inventory.`}
        action={
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 font-bold" tooltip="New return" shortcut="Alt+Shift+N">
            <RotateCcw className="w-4 h-4" /> Process New Return
          </Button>
        }
      />

      <Card>
        <div className="mb-3 text-xs text-zinc-500">
          Total refunded in view: <span className="font-bold text-amber-600">{formatCurrency(list.summary?.totalRefunded || 0)}</span>
        </div>
        <DataTable
          title="Sales_Returns_History"
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
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Process Sale Return"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleProcessReturn} className="space-y-4">
          {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 rounded-lg">{error}</div>}

          <div className="flex gap-2">
            <Input
              label="Original Bill Number *"
              value={selectedSaleNumber}
              onChange={(e) => setSelectedSaleNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookupSale(selectedSaleNumber);
                }
              }}
              placeholder="e.g. GM-2026-00001"
              autoFocus
            />
            <div className="flex items-end">
              <Button type="button" onClick={() => lookupSale(selectedSaleNumber)} variant="secondary" className="mb-0.5" loading={finding}>
                <Search className="w-4 h-4" /> Find Bill
              </Button>
            </div>
          </div>

          {targetSale && targetSale.status === "VOIDED" && (
            <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg font-semibold">This bill was voided and cannot be returned.</div>
          )}

          {targetSale && targetSale.status !== "VOIDED" && (
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
                  <span className="font-bold text-amber-600 dark:text-amber-400">{targetSale.paymentMethod === "CREDIT" ? "KHATA" : targetSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Bill Total / Already Refunded:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(targetSale.totalAmount)} / {formatCurrency(alreadyRefunded)}
                  </span>
                </div>
              </div>

              {outsideWindow && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300">
                    <Clock className="w-4 h-4" /> Bill is {Math.floor(ageDays)} days old (return window {RETURN_WINDOW_DAYS} days)
                  </div>
                  {isAdmin ? (
                    <label className="flex items-center gap-2 text-red-700 dark:text-red-300 cursor-pointer">
                      <input type="checkbox" checked={overrideWindow} onChange={(e) => setOverrideWindow(e.target.checked)} />
                      Override return window (recorded in the audit log)
                    </label>
                  ) : (
                    <p className="text-red-600">An admin must approve returns after the window.</p>
                  )}
                </div>
              )}

              {isKhataSale ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Refund goes to khata
                  </div>
                  <p className="text-amber-700 dark:text-amber-300 text-[11px]">
                    This bill was on khata (current balance{" "}
                    <span className="font-bold">{formatCurrency(targetSale.customer?.outstandingBalance || 0)}</span>). The refund reduces what the
                    customer owes.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">Refund by:</span>
                  {["CASH", "CARD", ...(targetSale.customerId ? ["CREDIT"] : [])].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRefundMethod(m)}
                      className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
                        refundMethod === m
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {m === "CREDIT" ? "Khata credit" : m}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Return quantity & condition per item</label>
                {targetSale.saleItems.map((si) => {
                  const remaining = Math.max(0, Math.round((si.quantity - (returnedQty[si.id] || 0)) * 1000) / 1000);
                  const effRate = round2(si.unitPrice * discountRatio);
                  return (
                    <div
                      key={si.id}
                      className={`p-3 border rounded-lg space-y-2 text-xs bg-white dark:bg-zinc-900 ${
                        remaining <= 0 ? "opacity-50 border-zinc-100" : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{si.product.name}</p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 flex-wrap">
                            <Tag className="w-3 h-3" /> Paid rate: <span className="font-bold">{formatCurrency(effRate)}</span> / {si.product.unit?.symbol || "unit"}
                            {discountRatio < 1 && <span className="text-[10px] text-zinc-400 line-through font-normal ml-1">({formatCurrency(si.unitPrice)})</span>}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Bought {si.quantity} {si.product.unit?.symbol} • Returned {returnedQty[si.id] || 0} • Can return {remaining}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step={si.product.unit?.allowDecimal !== false ? "any" : "1"}
                            min="0"
                            max={remaining}
                            disabled={remaining <= 0}
                            value={returnQtyMap[si.id] ?? ""}
                            placeholder="0"
                            onChange={(e) => setReturnQtyMap({ ...returnQtyMap, [si.id]: e.target.value })}
                            className={`w-20 text-center text-xs font-bold p-1 bg-white dark:bg-zinc-900 border rounded focus:ring-1 focus:ring-amber-500 ${
                              parseFloat(returnQtyMap[si.id]) > remaining ? "border-red-500" : ""
                            }`}
                          />
                          {remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => setReturnQtyMap({ ...returnQtyMap, [si.id]: String(remaining) })}
                              className="text-[10px] font-bold text-zinc-500 underline cursor-pointer"
                            >
                              All
                            </button>
                          )}
                        </div>
                      </div>

                      {parseFloat(returnQtyMap[si.id]) > 0 && (
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500 font-medium">Condition:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setItemConditions({ ...itemConditions, [si.id]: "RESTOCK" })}
                              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                itemConditions[si.id] !== "DAMAGED_WASTE" ? "bg-emerald-500 text-white shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <PackageCheck className="w-3 h-3" /> Restock
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemConditions({ ...itemConditions, [si.id]: "DAMAGED_WASTE" })}
                              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                itemConditions[si.id] === "DAMAGED_WASTE" ? "bg-amber-600 text-white shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <Scissors className="w-3 h-3" /> Damaged / Waste
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {estimatedRefund > 0 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex justify-between items-center text-xs">
                  <span className="font-semibold text-amber-800 dark:text-amber-200">Estimated refund:</span>
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">{formatCurrency(estimatedRefund)}</span>
                </div>
              )}

              <Input
                label="Return Reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Weave defect / Customer changed mind"
              />

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="w-1/3"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} loadingText="Processing..." className="w-2/3 font-bold">
                  Confirm Return
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
