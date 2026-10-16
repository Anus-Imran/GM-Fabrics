"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Printer, MessageCircle } from "lucide-react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { Badge } from "../common/badge.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDateTime } from "../../utils/formatDate.js";
import api from "../../services/apiService.js";

const TYPE_LABEL = {
  SALE: { text: "Khata Sale", variant: "amber" },
  PAYMENT: { text: "Payment", variant: "emerald" },
  RETURN: { text: "Return", variant: "info" },
  VOID: { text: "Bill Voided", variant: "danger" },
  ADJUSTMENT: { text: "Adjustment", variant: "default" },
};

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Customer khata statement: every sale on credit, payment, return and adjustment with running balance. */
export const KhataLedgerModal = ({ isOpen, onClose, customer }) => {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen, customer?.id]);

  useEffect(() => {
    if (!isOpen || !customer) return;
    setLoading(true);
    setError("");
    api
      .get(`/customers/${customer.id}/ledger`, { params: { page, pageSize: 50 } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, customer, page]);

  if (!customer) return null;

  const printStatement = () => {
    if (!data) return;
    const rows = data.items
      .map(
        (e) =>
          `<tr><td>${escapeHtml(formatDateTime(e.createdAt))}</td><td>${escapeHtml(TYPE_LABEL[e.type]?.text || e.type)}</td><td>${escapeHtml(
            e.sale?.saleNumber || e.notes || ""
          )}</td><td style="text-align:right">${e.amount > 0 ? e.amount.toLocaleString("en-PK") : ""}</td><td style="text-align:right">${
            e.amount < 0 ? Math.abs(e.amount).toLocaleString("en-PK") : ""
          }</td><td style="text-align:right"><b>${e.balanceAfter.toLocaleString("en-PK")}</b></td></tr>`
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Khata ${escapeHtml(data.customer.name)}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}h2{margin:0}</style></head>
      <body><h2>GM FABRICS — Khata Statement</h2><p><b>${escapeHtml(data.customer.name)}</b> ${escapeHtml(data.customer.phone || "")}<br>
      Current balance: <b>PKR ${data.customer.outstandingBalance.toLocaleString("en-PK")}</b></p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead><tbody>${rows}</tbody></table>
      ${data.openingBalance ? `<p>Opening balance before ledger: PKR ${data.openingBalance.toLocaleString("en-PK")}</p>` : ""}</body></html>`;
    const w = window.open("", "_blank", "width=800,height=900");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
  };

  const remind = () => {
    let phone = (customer.phone || "").replace(/\D/g, "");
    if (phone.startsWith("0")) phone = `92${phone.slice(1)}`;
    const msg = `Assalam o Alaikum ${customer.name}, your khata balance at GM Fabrics is PKR ${(data?.customer?.outstandingBalance ?? customer.outstandingBalance).toLocaleString(
      "en-PK"
    )}. Thank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Khata Statement — ${customer.name}`} icon={BookOpen} maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            <p className="text-zinc-500">Current balance</p>
            <p className={`text-2xl font-black ${(data?.customer?.outstandingBalance ?? customer.outstandingBalance) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatCurrency(data?.customer?.outstandingBalance ?? customer.outstandingBalance)}
            </p>
          </div>
          <div className="flex gap-2">
            {customer.phone && (
              <Button variant="outline" size="sm" onClick={remind} tooltip="Send balance reminder on WhatsApp">
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> Remind
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={printStatement} disabled={!data} tooltip="Print statement">
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 uppercase text-[10px]">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Reference</th>
                <th className="p-2 text-right">Debit (+)</th>
                <th className="p-2 text-right">Credit (−)</th>
                <th className="p-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-400">Loading…</td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-400">No khata activity recorded yet.</td>
                </tr>
              ) : (
                data.items.map((e) => (
                  <tr key={e.id}>
                    <td className="p-2 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                    <td className="p-2">
                      <Badge variant={TYPE_LABEL[e.type]?.variant}>{TYPE_LABEL[e.type]?.text || e.type}</Badge>
                      {e.method && e.type === "PAYMENT" && <span className="ml-1 text-[10px] text-zinc-400">{e.method}</span>}
                    </td>
                    <td className="p-2 text-zinc-600 dark:text-zinc-300">
                      {e.sale?.saleNumber && <span className="font-mono font-semibold mr-1">{e.sale.saleNumber}</span>}
                      <span className="text-zinc-400">{e.notes}</span>
                      {e.user?.name && <span className="block text-[10px] text-zinc-400">by {e.user.name}</span>}
                    </td>
                    <td className="p-2 text-right font-semibold text-amber-600">{e.amount > 0 ? formatCurrency(e.amount) : ""}</td>
                    <td className="p-2 text-right font-semibold text-emerald-600">{e.amount < 0 ? formatCurrency(Math.abs(e.amount)) : ""}</td>
                    <td className="p-2 text-right font-black">{formatCurrency(e.balanceAfter)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.openingBalance ? (
          <p className="text-[11px] text-zinc-400">
            Opening balance carried from before the ledger was introduced: {formatCurrency(data.openingBalance)}
          </p>
        ) : null}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 text-xs">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Newer
            </Button>
            <span>
              {page} / {data.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
              Older
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
