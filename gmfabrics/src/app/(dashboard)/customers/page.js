"use client";

import React, { useState } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { CustomerTable } from "../../../components/customers/customerTable.jsx";
import { CustomerModal } from "../../../components/customers/customerModal.jsx";
import { KhataSettleModal } from "../../../components/customers/khataSettleModal.jsx";
import { KhataLedgerModal } from "../../../components/customers/khataLedgerModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Plus } from "lucide-react";
import { showToastSuccess, showToastError, promptText, confirmDelete } from "../../../utils/alerts.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import api from "../../../services/apiService.js";
import { useServerList } from "../../../hooks/useServerList.js";
import { useHotkeys } from "../../../hooks/useHotkeys.js";
import { useAuth } from "../../../context/authContext.jsx";

export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const [onlyKhata, setOnlyKhata] = useState(false);
  const list = useServerList("/customers", { params: { withBalance: onlyKhata ? "true" : undefined } });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [settleCustomer, setSettleCustomer] = useState(null);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);

  useHotkeys(
    {
      "Alt+Shift+N": () => {
        setEditingCustomer(null);
        setShowCustomerModal(true);
      },
    },
    { enabled: !showCustomerModal }
  );

  // Errors are re-thrown so the modal shows them and stays open.
  const handleCreateOrUpdate = async (formData) => {
    if (editingCustomer) {
      await api.put(`/customers/${editingCustomer.id}`, formData);
      showToastSuccess("Customer profile updated!");
    } else {
      await api.post("/customers", formData);
      showToastSuccess("New customer added!");
    }
    list.reload();
  };

  const handleSettleBalance = async (customerId, payload) => {
    const res = await api.put(`/customers/${customerId}/settle`, payload);
    showToastSuccess(`Payment recorded. Remaining balance ${formatCurrency(res.data?.outstandingBalance || 0)}`);
    list.reload();
  };

  const handleAdjust = async (customer) => {
    const amountText = await promptText(`Adjust khata — ${customer.name}`, {
      label: "Amount to ADD to the balance (use a minus sign to reduce it), e.g. 500 or -200",
      placeholder: "e.g. -200",
      confirmButtonText: "Next",
    });
    if (amountText === null) return;
    const amount = parseFloat(amountText);
    if (!amount || isNaN(amount)) {
      showToastError("Enter a non-zero amount.");
      return;
    }
    const reason = await promptText("Reason for adjustment", { placeholder: "e.g. Opening balance from old register", confirmButtonText: "Save Adjustment" });
    if (!reason) return;
    try {
      await api.post(`/customers/${customer.id}/adjust`, { amount, notes: reason });
      showToastSuccess("Khata balance adjusted and logged.");
      list.reload();
    } catch (err) {
      showToastError(err.message);
    }
  };

  const handleDelete = async (customer) => {
    if (!(await confirmDelete(`Delete ${customer.name}?`, "This customer has no bills and no balance."))) return;
    try {
      await api.delete(`/customers/${customer.id}`);
      showToastSuccess("Customer deleted.");
      list.reload();
    } catch (err) {
      showToastError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Accounts & Khata Balances"
        description="Manage customer profiles, receive khata payments and view each customer's full statement."
        action={
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setShowCustomerModal(true);
            }}
            className="flex items-center gap-2 font-bold"
            tooltip="Add customer"
            shortcut="Alt+Shift+N"
          >
            <Plus className="w-4 h-4" /> Add New Customer
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">Total khata receivable</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{formatCurrency(list.summary?.totalOutstanding || 0)}</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={onlyKhata} onChange={(e) => setOnlyKhata(e.target.checked)} className="w-4 h-4" />
          Show only customers with balance due
        </label>
      </div>

      <Card>
        {list.error && <p className="text-xs text-red-600 mb-3">{list.error}</p>}
        <CustomerTable
          list={list}
          isAdmin={isAdmin}
          onEdit={(cust) => {
            setEditingCustomer(cust);
            setShowCustomerModal(true);
          }}
          onSettleKhata={setSettleCustomer}
          onLedger={setLedgerCustomer}
          onAdjust={handleAdjust}
          onDelete={handleDelete}
        />
      </Card>

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingCustomer}
      />

      <KhataSettleModal isOpen={!!settleCustomer} onClose={() => setSettleCustomer(null)} onSettle={handleSettleBalance} customer={settleCustomer} />

      <KhataLedgerModal isOpen={!!ledgerCustomer} onClose={() => setLedgerCustomer(null)} customer={ledgerCustomer} />
    </div>
  );
}
