"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Wallet, Lock, Unlock, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { Loader } from "../../../components/common/loader.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { blockInvalidNumberKeys } from "../../../utils/validators.js";
import { confirmAction, showToastError, showToastSuccess } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { useServerList } from "../../../hooks/useServerList.js";

const Row = ({ label, value, strong, negative, hint }) => (
  <div className={`flex justify-between py-1.5 text-xs ${strong ? "font-black text-sm border-t border-zinc-200 dark:border-zinc-700 pt-2 mt-1" : ""}`}>
    <span className="text-zinc-600 dark:text-zinc-400">
      {label}
      {hint && <span className="block text-[10px] text-zinc-400">{hint}</span>}
    </span>
    <span className={negative ? "text-rose-600" : "text-zinc-900 dark:text-zinc-100"}>
      {negative ? "− " : ""}
      {formatCurrency(value || 0)}
    </span>
  </div>
);

/** Z-report body used both for the live session and closed history. */
const SessionReport = ({ summary }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-1">Cash drawer</h4>
      <Row label="Opening float" value={summary.openingCash} />
      <Row label="Cash sales" value={summary.cashSales} />
      <Row label="Khata advance received" value={summary.khataAdvanceCash} />
      <Row label="Khata payments (cash)" value={summary.khataCashReceived} />
      <Row label="Cash refunds" value={summary.cashRefunds} negative />
      <Row label="Expenses paid from drawer" value={summary.drawerExpenses} negative />
      <Row label="Supplier payments from drawer" value={summary.drawerSupplierPayments} negative />
      <Row label="Expected cash in drawer" value={summary.expectedCash} strong />
    </div>
    <div>
      <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-1">Sales summary ({summary.billsCount} bills)</h4>
      <Row label="Gross sales" value={summary.grossSales} />
      <Row label="Card / digital sales" value={summary.cardSales} />
      <Row label="Khata sales (total)" value={summary.creditSalesTotal} hint={`Added to khata: ${formatCurrency(summary.khataAdded)}`} />
      <Row label="Card refunds" value={summary.cardRefunds} negative />
      <Row label="Khata refunds" value={summary.khataRefunds} negative />
      <Row label="Khata payments (card)" value={summary.khataCardReceived} />
      {summary.cashiers?.length > 0 && (
        <div className="mt-3">
          <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-1">By cashier</h4>
          <table className="w-full text-xs">
            <thead className="text-[10px] text-zinc-400">
              <tr>
                <th className="text-left">Cashier</th>
                <th className="text-right">Bills</th>
                <th className="text-right">Cash</th>
                <th className="text-right">Card</th>
                <th className="text-right">Khata</th>
              </tr>
            </thead>
            <tbody>
              {summary.cashiers.map((c) => (
                <tr key={c.userId}>
                  <td>{c.name}</td>
                  <td className="text-right">{c.bills}</td>
                  <td className="text-right">{formatCurrency(c.cash)}</td>
                  <td className="text-right">{formatCurrency(c.card)}</td>
                  <td className="text-right">{formatCurrency(c.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

const printZReport = (session) => {
  const s = session.summary;
  const line = (l, v) => `<div style="display:flex;justify-content:space-between"><span>${l}</span><span>${Number(v || 0).toLocaleString("en-PK")}</span></div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Z-Report #${session.id}</title><style>
    @page{size:80mm auto;margin:0} body{width:76mm;margin:0 auto;padding:8px;font-family:'Courier New',monospace;font-size:12px}
    hr{border:0;border-top:1px dashed #000}</style></head><body>
    <div style="text-align:center;font-weight:900;font-size:16px">GM FABRICS</div>
    <div style="text-align:center">DAY CLOSE / Z-REPORT #${session.id}</div><hr>
    ${line("Opened", "")}<div>${new Date(session.openedAt).toLocaleString("en-PK")}</div>
    <div>Closed: ${session.closedAt ? new Date(session.closedAt).toLocaleString("en-PK") : "OPEN"}</div><hr>
    ${line("Opening float", s.openingCash)}${line("Cash sales", s.cashSales)}${line("Khata advance", s.khataAdvanceCash)}
    ${line("Khata payments", s.khataCashReceived)}${line("Cash refunds", -s.cashRefunds)}${line("Drawer expenses", -s.drawerExpenses)}
    ${line("Supplier payments", -s.drawerSupplierPayments)}<hr>${line("EXPECTED CASH", s.expectedCash)}
    ${session.countedCash !== null && session.countedCash !== undefined ? line("COUNTED CASH", session.countedCash) + line("DIFFERENCE", session.difference) : ""}<hr>
    ${line("Bills", s.billsCount)}${line("Gross sales", s.grossSales)}${line("Card sales", s.cardSales)}${line("Khata sales", s.creditSalesTotal)}
    <hr><div style="text-align:center">Printed ${new Date().toLocaleString("en-PK")}</div></body></html>`;
  const w = window.open("", "_blank", "width=400,height=700");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }
};

export default function DayClosePage() {
  const [current, setCurrent] = useState(undefined);
  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewSession, setViewSession] = useState(null);
  const history = useServerList("/cash-sessions", { pageSize: 10 });

  const loadCurrent = useCallback(async () => {
    try {
      const res = await api.get("/cash-sessions/current");
      setCurrent(res.data || null);
    } catch (err) {
      showToastError(err.message);
      setCurrent(null);
    }
  }, []);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  const openDrawer = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/cash-sessions/open", { openingCash: parseFloat(openingCash) || 0, notes: notes || null });
      showToastSuccess("Cash drawer opened. Have a good day!");
      setOpeningCash("");
      setNotes("");
      await loadCurrent();
      history.reload();
    } catch (err) {
      showToastError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const closeDrawer = async (e) => {
    e.preventDefault();
    const counted = parseFloat(countedCash);
    if (isNaN(counted) || counted < 0) return showToastError("Enter the cash you counted in the drawer.");
    const diff = Math.round((counted - current.summary.expectedCash) * 100) / 100;
    const ok = await confirmAction(
      "Close the day?",
      `Expected ${formatCurrency(current.summary.expectedCash)}, counted ${formatCurrency(counted)} → ${
        diff === 0 ? "exact match" : diff > 0 ? `over by ${formatCurrency(diff)}` : `short by ${formatCurrency(Math.abs(diff))}`
      }.`,
      "Yes, close day"
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await api.post(`/cash-sessions/${current.id}/close`, { countedCash: counted, notes: notes || null });
      showToastSuccess("Day closed — Z-report saved.");
      setCountedCash("");
      setNotes("");
      setViewSession(res.data);
      await loadCurrent();
      history.reload();
    } catch (err) {
      showToastError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const diffPreview = current && countedCash !== "" ? Math.round(((parseFloat(countedCash) || 0) - current.summary.expectedCash) * 100) / 100 : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day Open / Day Close"
        description="Open the cash drawer with a float, then count and close at the end of the day. Every close saves a Z-report."
        action={
          <Button variant="outline" onClick={loadCurrent} tooltip="Refresh totals">
            <RefreshCw className="w-4 h-4" />
          </Button>
        }
      />

      {current === undefined ? (
        <Loader text="Checking cash drawer..." icon={Wallet} />
      ) : current === null ? (
        <Card>
          <form onSubmit={openDrawer} className="max-w-md space-y-4">
            <div className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-sm">Drawer is closed — open the day</h3>
            </div>
            <Input
              label="Opening cash (float) in drawer"
              type="number"
              min="0"
              step="any"
              value={openingCash}
              onKeyDown={blockInvalidNumberKeys}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="e.g. 5000"
              autoFocus
            />
            <Input label="Notes (optional)" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
            <Button type="submit" loading={busy} variant="success" className="w-full font-bold">
              Open Cash Drawer
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="emerald">OPEN</Badge>
                <h3 className="font-black text-sm">Session #{current.id}</h3>
              </div>
              <p className="text-[11px] text-zinc-500">
                Opened {formatDateTime(current.openedAt)} by {current.openedBy?.name}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => printZReport(current)} tooltip="Print X-report (running totals)">
              <Printer className="w-3.5 h-3.5 mr-1" /> X-Report
            </Button>
          </div>

          <SessionReport summary={current.summary} />

          <form onSubmit={closeDrawer} className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Input
              label="Cash counted in drawer"
              type="number"
              min="0"
              step="any"
              value={countedCash}
              onKeyDown={blockInvalidNumberKeys}
              onChange={(e) => setCountedCash(e.target.value)}
              placeholder={String(current.summary.expectedCash)}
            />
            <Input label="Closing notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
            <Button type="submit" loading={busy} variant="danger" className="font-bold">
              <Lock className="w-4 h-4 mr-1.5" /> Close Day
            </Button>
            {diffPreview !== null && (
              <p className={`md:col-span-3 text-xs font-bold ${diffPreview === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {diffPreview === 0 ? "Drawer matches exactly." : diffPreview > 0 ? `Over by ${formatCurrency(diffPreview)}` : `Short by ${formatCurrency(Math.abs(diffPreview))}`}
              </p>
            )}
          </form>
        </Card>
      )}

      <Card>
        <h3 className="text-sm font-black mb-3">Previous sessions</h3>
        <DataTable
          title="Cash_Sessions"
          serverMode
          data={history.items}
          totalCount={history.total}
          onQueryChange={history.setQuery}
          loading={history.loading}
          enableSelection={false}
          enableDateFilter={false}
          defaultPageSize={10}
          columns={[
            { key: "id", label: "#", sortable: false, render: (s) => <span className="font-mono">#{s.id}</span> },
            { key: "openedAt", label: "Opened", sortable: false, render: (s) => `${formatDateTime(s.openedAt)} • ${s.openedBy?.name || ""}` },
            { key: "closedAt", label: "Closed", sortable: false, render: (s) => (s.closedAt ? `${formatDateTime(s.closedAt)} • ${s.closedBy?.name || ""}` : <Badge variant="emerald">OPEN</Badge>) },
            { key: "expectedCash", label: "Expected", sortable: false, render: (s) => (s.expectedCash !== null ? formatCurrency(s.expectedCash) : "—") },
            { key: "countedCash", label: "Counted", sortable: false, render: (s) => (s.countedCash !== null ? formatCurrency(s.countedCash) : "—") },
            {
              key: "difference",
              label: "Difference",
              sortable: false,
              render: (s) =>
                s.difference === null || s.difference === undefined ? (
                  "—"
                ) : (
                  <span className={`font-bold ${Math.abs(s.difference) < 1 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(s.difference)}</span>
                ),
            },
            {
              key: "actions",
              label: "",
              sortable: false,
              render: (s) =>
                s.summary ? (
                  <button onClick={() => setViewSession(s)} className="text-[11px] font-bold underline cursor-pointer">
                    View
                  </button>
                ) : null,
            },
          ]}
        />
      </Card>

      <Modal isOpen={!!viewSession} onClose={() => setViewSession(null)} title={`Z-Report — Session #${viewSession?.id || ""}`} icon={Wallet} maxWidth="max-w-3xl">
        {viewSession?.summary && (
          <div className="space-y-4">
            <SessionReport summary={viewSession.summary} />
            {viewSession.countedCash !== null && viewSession.countedCash !== undefined && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs flex justify-between font-bold">
                <span>Counted {formatCurrency(viewSession.countedCash)}</span>
                <span className={Math.abs(viewSession.difference) < 1 ? "text-emerald-600" : "text-rose-600"}>Difference {formatCurrency(viewSession.difference)}</span>
              </div>
            )}
            <Button onClick={() => printZReport(viewSession)} className="w-full">
              <Printer className="w-4 h-4 mr-1.5" /> Print Z-Report
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
