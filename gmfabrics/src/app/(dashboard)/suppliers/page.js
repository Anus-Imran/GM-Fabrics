"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { Tooltip } from "../../../components/common/tooltip.jsx";
import { Plus, Edit2, Trash2, Truck, BookOpen, Banknote, PackageMinus } from "lucide-react";
import { SupplierReturnModal } from "../../../components/inventory/supplierReturnModal.jsx";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import { maskPhone, isValidPhone, blockInvalidNumberKeys } from "../../../utils/validators.js";
import api from "../../../services/apiService.js";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { Loader } from "../../../components/common/loader.jsx";
import { useHotkeys } from "../../../hooks/useHotkeys.js";

const EMPTY = { name: "", phone: "", address: "", city: "", notes: "" };
const field = "w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [ledgerFor, setLedgerFor] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [payment, setPayment] = useState({ amount: "", method: "CASH", reference: "", fromDrawer: false, notes: "" });
  const [payError, setPayError] = useState("");
  const [returnPreset, setReturnPreset] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data || []);
    } catch (err) {
      showToastError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openLedger = async (sup) => {
    setLedgerFor(sup);
    setLedger(null);
    try {
      const res = await api.get(`/suppliers/${sup.id}/ledger`);
      setLedger(res.data);
    } catch (err) {
      showToastError(err.message);
    }
  };

  const handleOpenModal = (sup = null) => {
    setError("");
    setEditingSupplier(sup);
    setFormData(
      sup
        ? { name: sup.name || "", phone: maskPhone(sup.phone || ""), address: sup.address || "", city: sup.city || "", notes: sup.notes || "" }
        : EMPTY
    );
    setShowModal(true);
  };

  useHotkeys({ "Alt+Shift+N": () => handleOpenModal() }, { enabled: !showModal });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.name.trim()) return setError("Supplier name is required.");
    if (!isValidPhone(formData.phone)) return setError("Enter a valid phone number, e.g. 0300-1234567.");
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone ? formData.phone.replace(/\D/g, "") : null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      notes: formData.notes.trim() || null,
    };
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
        showToastSuccess("Supplier profile updated!");
      } else {
        await api.post("/suppliers", payload);
        showToastSuccess("New supplier added!");
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sup) => {
    if (!(await confirmDelete(`Delete ${sup.name}?`, "Only suppliers without purchase or payment history can be deleted."))) return;
    try {
      await api.delete(`/suppliers/${sup.id}`);
      showToastSuccess("Supplier deleted.");
      fetchSuppliers();
    } catch (err) {
      showToastError(err.message || "Failed to delete supplier.");
    }
  };

  const openPayment = (sup) => {
    setPayFor(sup);
    setPayError("");
    setPayment({ amount: sup.balanceDue > 0 ? String(sup.balanceDue) : "", method: "CASH", reference: "", fromDrawer: false, notes: "" });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setPayError("");
    const amt = parseFloat(payment.amount);
    if (!(amt > 0)) return setPayError("Enter an amount greater than zero.");
    setSaving(true);
    try {
      await api.post(`/suppliers/${payFor.id}/payments`, { ...payment, amount: amt });
      showToastSuccess(`Payment of ${formatCurrency(amt)} recorded for ${payFor.name}`);
      setPayFor(null);
      fetchSuppliers();
      if (ledgerFor?.id === payFor.id) openLedger(payFor);
    } catch (err) {
      setPayError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (row) => {
    if (!(await confirmDelete("Delete this payment?", `${formatCurrency(row.credit)} will be added back to the balance due.`))) return;
    try {
      await api.delete(`/suppliers/${ledgerFor.id}/payments/${row.paymentId}`);
      showToastSuccess("Payment deleted.");
      openLedger(ledgerFor);
      fetchSuppliers();
    } catch (err) {
      showToastError(err.message);
    }
  };

  const totalDue = suppliers.reduce((s, x) => s + Math.max(0, x.balanceDue || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers & Payables"
        description="Vendor profiles, what you bought from each, what you paid and what you still owe."
        action={
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 font-bold" tooltip="Add supplier" shortcut="Alt+Shift+N">
            <Plus className="w-4 h-4" /> Add New Supplier
          </Button>
        }
      />

      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 inline-block">
        <p className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">Total payable to suppliers</p>
        <p className="text-xl font-black text-rose-700 dark:text-rose-300">{formatCurrency(totalDue)}</p>
      </div>

      <Card>
        {loading ? (
          <Loader text="Loading supplier & vendor profiles..." icon={Truck} />
        ) : (
          <DataTable
            title="Suppliers_List"
            columns={[
              {
                key: "name",
                label: "Supplier Name",
                render: (s) => (
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{s.name}</p>
                    <p className="text-[10px] text-zinc-400">
                      {s._count?.products || 0} products • {s._count?.stockEntries || 0} purchases
                    </p>
                  </div>
                ),
              },
              { key: "phone", label: "Phone", render: (s) => <span className="font-mono">{s.phone || "—"}</span> },
              { key: "city", label: "City", render: (s) => s.city || "—" },
              { key: "totalPurchased", label: "Purchased", render: (s) => formatCurrency(s.totalPurchased) },
              { key: "totalPaid", label: "Paid", render: (s) => formatCurrency(s.totalPaid) },
              {
                key: "totalReturned",
                label: "Returned",
                render: (s) => (s.totalReturned > 0 || s.totalRefunded > 0 ? formatCurrency(s.totalReturned - s.totalRefunded) : "—"),
              },
              {
                key: "balanceDue",
                label: "Balance Due",
                render: (s) =>
                  s.balanceDue > 0 ? (
                    <span className="font-black text-rose-600">{formatCurrency(s.balanceDue)}</span>
                  ) : s.balanceDue < 0 ? (
                    <Badge variant="emerald">Advance {formatCurrency(Math.abs(s.balanceDue))}</Badge>
                  ) : (
                    <Badge variant="default">Settled</Badge>
                  ),
              },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                cellClassName: "text-right",
                render: (s) => (
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip label="Record payment">
                      <button onClick={() => openPayment(s)} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer" aria-label="Record payment">
                        <Banknote className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Return stock to supplier">
                      <button onClick={() => setReturnPreset({ supplierId: s.id })} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer" aria-label="Return stock">
                        <PackageMinus className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Statement">
                      <button onClick={() => openLedger(s)} className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Statement">
                        <BookOpen className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    <Tooltip label="Edit">
                      <button onClick={() => handleOpenModal(s)} className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    {(s._count?.stockEntries || 0) === 0 && s.totalPaid === 0 && (
                      <Tooltip label="Delete">
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                ),
              },
            ]}
            data={suppliers}
            searchKeys={["name", "phone", "city", "address"]}
            enableSelection={false}
            enableDateFilter={false}
          />
        )}
      </Card>

      <SupplierReturnModal
        isOpen={!!returnPreset}
        onClose={() => setReturnPreset(null)}
        preset={returnPreset}
        suppliers={suppliers}
        onDone={() => {
          showToastSuccess("Stock returned to supplier");
          fetchSuppliers();
        }}
      />

      {/* Add / edit supplier */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSupplier ? "Edit Supplier" : "Add New Supplier"} icon={Truck}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input label="Supplier / Company Name" value={formData.name} maxLength={150} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
              error={!isValidPhone(formData.phone) ? "Invalid phone" : null}
              placeholder="0300-1234567"
            />
            <Input label="City" value={formData.city} maxLength={100} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Faisalabad" />
          </div>
          <Input label="Address" value={formData.address} maxLength={300} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <Input label="Notes" value={formData.notes} maxLength={1000} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="w-1/3" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="w-2/3 font-bold">
              {editingSupplier ? "Update Supplier" : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record payment */}
      <Modal isOpen={!!payFor} onClose={() => setPayFor(null)} title={`Pay Supplier — ${payFor?.name || ""}`} icon={Banknote}>
        {payFor && (
          <form onSubmit={submitPayment} className="space-y-4">
            {payError && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{payError}</div>}
            <p className="text-xs text-zinc-500">
              Balance due: <span className="font-black text-rose-600">{formatCurrency(payFor.balanceDue)}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount (PKR)"
                type="number"
                min="0"
                step="any"
                value={payment.amount}
                onKeyDown={blockInvalidNumberKeys}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                required
                autoFocus
              />
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Method</label>
                <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} className={field}>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <Input label="Reference (cheque / transaction no.)" value={payment.reference} maxLength={100} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={payment.fromDrawer} onChange={(e) => setPayment({ ...payment, fromDrawer: e.target.checked })} />
              Paid from the counter cash drawer (counts in day close)
            </label>
            <Input label="Notes" value={payment.notes} maxLength={500} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
            <div className="flex gap-3">
              <Button variant="outline" className="w-1/3" onClick={() => setPayFor(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="w-2/3 font-bold">
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Statement */}
      <Modal isOpen={!!ledgerFor} onClose={() => setLedgerFor(null)} title={`Supplier Statement — ${ledgerFor?.name || ""}`} icon={BookOpen} maxWidth="max-w-3xl">
        {!ledger ? (
          <Loader text="Loading statement..." />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                <p className="text-zinc-500">Purchased</p>
                <p className="font-black text-base">{formatCurrency(ledger.totalPurchased)}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                <p className="text-zinc-500">Paid</p>
                <p className="font-black text-base text-emerald-600">{formatCurrency(ledger.totalPaid)}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                <p className="text-zinc-500">Returned (net)</p>
                <p className="font-black text-base text-rose-600">{formatCurrency((ledger.totalReturned || 0) - (ledger.totalRefunded || 0))}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                <p className="text-zinc-500">Balance due</p>
                <p className="font-black text-base text-rose-600">{formatCurrency(ledger.balanceDue)}</p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Details</th>
                    <th className="p-2 text-right">Purchase / refund</th>
                    <th className="p-2 text-right">Payment / return</th>
                    <th className="p-2 text-right">Balance</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {ledger.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400">No purchases or payments yet.</td>
                    </tr>
                  ) : (
                    ledger.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 whitespace-nowrap">{formatDateTime(r.date)}</td>
                        <td className="p-2">
                          {r.description}
                          {r.reference && <span className="ml-1 font-mono text-[10px] text-zinc-400">{r.reference}</span>}
                        </td>
                        <td className="p-2 text-right">{r.debit ? formatCurrency(r.debit) : ""}</td>
                        <td className="p-2 text-right text-emerald-600">{r.credit ? formatCurrency(r.credit) : ""}</td>
                        <td className="p-2 text-right font-bold">{formatCurrency(r.balance)}</td>
                        <td className="p-2 text-right">
                          {r.type === "PAYMENT" && (
                            <button onClick={() => deletePayment(r)} className="text-zinc-400 hover:text-red-600 cursor-pointer" aria-label="Delete payment">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
