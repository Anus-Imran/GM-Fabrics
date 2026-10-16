"use client";

import React, { useEffect, useState } from "react";
import { PackageCheck, Undo2, Trash2, Plus } from "lucide-react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Tooltip } from "../../../components/common/tooltip.jsx";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { SupplierReturnModal } from "../../../components/inventory/supplierReturnModal.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { blockInvalidNumberKeys } from "../../../utils/validators.js";
import { confirmAction, confirmDelete, showToastError, showToastSuccess } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { useServerList } from "../../../hooks/useServerList.js";
import { useHotkeys } from "../../../hooks/useHotkeys.js";

const STATUS = {
  COMPLETED: { text: "Returned", variant: "default" },
  PENDING_REPLACEMENT: { text: "Waiting for replacement", variant: "amber" },
  PARTIALLY_REPLACED: { text: "Partly replaced", variant: "amber" },
  REPLACED: { text: "Replaced", variant: "emerald" },
  CONVERTED: { text: "Converted to return", variant: "info" },
};
const isPending = (r) => r.status === "PENDING_REPLACEMENT" || r.status === "PARTIALLY_REPLACED";
const field = "w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700";

export default function SupplierReturnsPage() {
  const [status, setStatus] = useState("");
  const list = useServerList("/supplier-returns", { params: { status } });
  const [suppliers, setSuppliers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [receiveFor, setReceiveFor] = useState(null);
  const [receiveQty, setReceiveQty] = useState("");
  const [convertFor, setConvertFor] = useState(null);
  const [convert, setConvert] = useState({ settlement: "ADJUST", refundMethod: "CASH", refundToDrawer: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/suppliers").then((r) => setSuppliers(r.data || [])).catch(() => {});
  }, []);

  useHotkeys({ "Alt+Shift+N": () => setShowNew(true) }, { enabled: !showNew && !receiveFor && !convertFor });

  const doReceive = async (e) => {
    e.preventDefault();
    const q = parseFloat(receiveQty);
    if (!(q > 0) || q > receiveFor.outstandingQuantity) return showToastError(`Enter 1 to ${receiveFor.outstandingQuantity}.`);
    const unit = receiveFor.product?.unit?.symbol || "";
    if (!(await confirmAction("Receive replacement?", `${q} ${unit} of ${receiveFor.product?.name} will be added back into lot #${receiveFor.batchId}.`, "Yes, add to stock"))) return;
    setBusy(true);
    try {
      await api.post(`/supplier-returns/${receiveFor.id}/receive`, { quantity: q });
      showToastSuccess(`${q} ${unit} added back to stock`);
      setReceiveFor(null);
      list.reload();
    } catch (err) {
      showToastError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doConvert = async (e) => {
    e.preventDefault();
    const value = Math.round(convertFor.outstandingQuantity * convertFor.costPerUnit * 100) / 100;
    const effect = convert.settlement === "ADJUST" ? `the supplier balance goes down by ${formatCurrency(value)}` : `the supplier refunds ${formatCurrency(value)}`;
    if (!(await confirmAction("Convert to return?", `${convertFor.outstandingQuantity} unreplaced ${convertFor.product?.unit?.symbol || ""} stay with the supplier and ${effect}.`, "Yes, convert"))) return;
    setBusy(true);
    try {
      await api.post(`/supplier-returns/${convertFor.id}/convert`, convert);
      showToastSuccess("Converted to a return");
      setConvertFor(null);
      list.reload();
    } catch (err) {
      showToastError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (r) => {
    const back = r.outstandingQuantity;
    if (
      !(await confirmDelete(
        "Delete this supplier return?",
        `${back > 0 ? `${back} ${r.product?.unit?.symbol || ""} go back into stock (lot #${r.batchId}). ` : ""}Its credit note / refund is removed from the supplier balance.`
      ))
    )
      return;
    try {
      await api.delete(`/supplier-returns/${r.id}`);
      showToastSuccess("Supplier return deleted, stock restored");
      list.reload();
    } catch (err) {
      showToastError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Returns & Replacements"
        description="Send pieces back to a supplier. Stock leaves the exact purchase lot, and the supplier balance updates automatically."
        action={
          <Button onClick={() => setShowNew(true)} className="font-bold" tooltip="New supplier return" shortcut="Alt+Shift+N">
            <Plus className="w-4 h-4 mr-1" /> Return to Supplier
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Credit notes (balance reduced)</p>
          <p className="text-xl font-black">{formatCurrency(list.summary?.totalCredit || 0)}</p>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Refunds received</p>
          <p className="text-xl font-black">{formatCurrency(list.summary?.totalRefunded || 0)}</p>
        </div>
        <button
          onClick={() => setStatus((s) => (s === "PENDING" ? "" : "PENDING"))}
          className={`p-4 border text-left cursor-pointer ${
            status === "PENDING" ? "bg-amber-500 border-amber-500 text-white" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <p className="text-[10px] font-bold uppercase opacity-80">Waiting for replacement</p>
          <p className="text-xl font-black">{list.summary?.pendingReplacements || 0}</p>
          <p className="text-[10px] opacity-70">{status === "PENDING" ? "Showing pending — click to show all" : "Click to filter"}</p>
        </button>
      </div>

      <Card>
        {list.error && <p className="text-xs text-red-600 mb-3">{list.error}</p>}
        <DataTable
          title="Supplier_Returns"
          serverMode
          data={list.items}
          totalCount={list.total}
          onQueryChange={list.setQuery}
          loading={list.loading}
          dateKey="returnedAt"
          enableSelection={false}
          defaultPageSize={25}
          columns={[
            { key: "returnedAt", label: "Date", sortable: false, render: (r) => <span className="whitespace-nowrap">{formatDateTime(r.returnedAt)}</span> },
            { key: "supplier", label: "Supplier", sortable: false, exportValue: (r) => r.supplier?.name, render: (r) => <span className="font-semibold">{r.supplier?.name}</span> },
            {
              key: "product",
              label: "Product / Lot",
              sortable: false,
              exportValue: (r) => r.product?.name,
              render: (r) => (
                <div>
                  <p className="font-semibold">{r.product?.name}</p>
                  <p className="text-[10px] text-zinc-400">
                    Lot #{r.batchId || "—"}
                    {r.stockEntry?.invoiceNumber ? ` • Inv ${r.stockEntry.invoiceNumber}` : ""} @ {formatCurrency(r.costPerUnit)}
                  </p>
                </div>
              ),
            },
            {
              key: "quantity",
              label: "Quantity",
              sortable: false,
              render: (r) => (
                <div>
                  <span className="font-bold text-rose-600">
                    −{r.quantity} {r.product?.unit?.symbol}
                  </span>
                  {r.replacedQuantity > 0 && (
                    <p className="text-[10px] text-emerald-600 font-semibold">
                      +{r.replacedQuantity} replaced
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "type",
              label: "Type / Status",
              sortable: false,
              render: (r) => (
                <div className="space-y-1">
                  <Badge variant={r.type === "RETURN" ? "dark" : "info"}>{r.type === "RETURN" ? "Return" : "Replacement"}</Badge>
                  <div>
                    <Badge variant={STATUS[r.status]?.variant}>{STATUS[r.status]?.text || r.status}</Badge>
                  </div>
                </div>
              ),
            },
            {
              key: "money",
              label: "Supplier Effect",
              sortable: false,
              render: (r) =>
                r.creditAmount > 0 || r.refundReceived > 0 ? (
                  <div className="text-xs">
                    {r.creditAmount > 0 && <p>Credit {formatCurrency(r.creditAmount)}</p>}
                    {r.refundReceived > 0 && (
                      <p className="text-emerald-600">
                        Refund {formatCurrency(r.refundReceived)} ({r.refundMethod})
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-400 text-xs">—</span>
                ),
            },
            { key: "reason", label: "Reason", sortable: false, render: (r) => <span className="text-zinc-500 text-xs">{r.reason || "—"}</span> },
            { key: "user", label: "By", sortable: false, exportValue: (r) => r.user?.name, render: (r) => r.user?.name || "—" },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              cellClassName: "text-right",
              render: (r) => (
                <div className="flex items-center justify-end gap-1">
                  {isPending(r) && (
                    <>
                      <Tooltip label="Replacement pieces arrived">
                        <button
                          onClick={() => {
                            setReceiveFor(r);
                            setReceiveQty(String(r.outstandingQuantity));
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <PackageCheck className="w-3 h-3" /> Receive
                        </button>
                      </Tooltip>
                      <Tooltip label="Supplier will not replace — make it a return">
                        <button
                          onClick={() => {
                            setConvertFor(r);
                            setConvert({ settlement: "ADJUST", refundMethod: "CASH", refundToDrawer: false });
                          }}
                          className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          aria-label="Convert to return"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip label="Delete (stock goes back)">
                    <button onClick={() => doDelete(r)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer" aria-label="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <SupplierReturnModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        suppliers={suppliers}
        onDone={() => {
          showToastSuccess("Stock returned to supplier");
          list.reload();
        }}
      />

      <Modal isOpen={!!receiveFor} onClose={() => setReceiveFor(null)} title="Receive Replacement" icon={PackageCheck}>
        {receiveFor && (
          <form onSubmit={doReceive} className="space-y-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              {receiveFor.product?.name} from {receiveFor.supplier?.name}: waiting for{" "}
              <b>
                {receiveFor.outstandingQuantity} {receiveFor.product?.unit?.symbol}
              </b>
              . Received pieces go back into lot #{receiveFor.batchId} at {formatCurrency(receiveFor.costPerUnit)}.
            </p>
            <Input
              label="Pieces received now"
              type="number"
              min="0"
              max={receiveFor.outstandingQuantity}
              step={receiveFor.product?.unit?.allowDecimal === false ? "1" : "any"}
              value={receiveQty}
              onKeyDown={blockInvalidNumberKeys}
              onChange={(e) => setReceiveQty(e.target.value)}
              autoFocus
            />
            <Button type="submit" loading={busy} variant="success" className="w-full font-bold">
              Add to Stock
            </Button>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!convertFor} onClose={() => setConvertFor(null)} title="Convert to Return" icon={Undo2}>
        {convertFor && (
          <form onSubmit={doConvert} className="space-y-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              {convertFor.outstandingQuantity} {convertFor.product?.unit?.symbol} of {convertFor.product?.name} were not replaced. Value:{" "}
              <b>{formatCurrency(convertFor.outstandingQuantity * convertFor.costPerUnit)}</b>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["ADJUST", "Reduce supplier balance"],
                ["REFUND", "Supplier pays money back"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setConvert({ ...convert, settlement: v })}
                  className={`p-2 border-2 font-bold cursor-pointer ${convert.settlement === v ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-200 dark:border-zinc-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {convert.settlement === "REFUND" && (
              <div className="grid grid-cols-2 gap-2 items-center">
                <select value={convert.refundMethod} onChange={(e) => setConvert({ ...convert, refundMethod: e.target.value })} className={field}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={convert.refundToDrawer} onChange={(e) => setConvert({ ...convert, refundToDrawer: e.target.checked })} /> Into cash drawer
                </label>
              </div>
            )}
            <Button type="submit" loading={busy} className="w-full font-bold">
              Convert to Return
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
