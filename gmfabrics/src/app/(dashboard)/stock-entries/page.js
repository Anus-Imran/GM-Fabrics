"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { StockEntryTable } from "../../../components/inventory/stockEntryTable.jsx";
import { StockEntryModal } from "../../../components/inventory/stockEntryModal.jsx";
import { PurchaseInvoiceModal } from "../../../components/inventory/purchaseInvoiceModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Plus, FileText } from "lucide-react";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import api from "../../../services/apiService.js";
import { useServerList } from "../../../hooks/useServerList.js";
import { useHotkeys } from "../../../hooks/useHotkeys.js";

export default function StockEntriesPage() {
  const list = useServerList("/stock-entries");
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const loadLookups = useCallback(() => {
    api.get("/products", { params: { view: "pos" } }).then((r) => setProducts(r.data || [])).catch(() => {});
    api.get("/suppliers").then((r) => setSuppliers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useHotkeys(
    {
      "Alt+Shift+N": () => setShowInvoice(true),
    },
    { enabled: !showModal && !showInvoice }
  );

  const afterChange = () => {
    list.reload();
    loadLookups();
  };

  const handleDelete = async (id) => {
    const ok = await confirmDelete("Delete Stock Purchase Lot?", "Stock, FIFO lots and the latest cost price will be updated.");
    if (!ok) return;
    try {
      await api.delete(`/stock-entries/${id}`);
      showToastSuccess("Stock purchase entry deleted.");
      afterChange();
    } catch (err) {
      showToastError(err.message || "Failed to delete stock purchase entry.");
    }
  };

  const handleDeleteSelected = async (selectedIds) => {
    if (!selectedIds?.length) return;
    try {
      await api.delete("/stock-entries", { data: { ids: selectedIds } });
      showToastSuccess(`${selectedIds.length} purchase entries deleted.`);
      afterChange();
    } catch (err) {
      showToastError(err.message || "Failed to delete selected purchase entries.");
      throw err;
    }
  };

  const handleSaveStockEntry = async (formData) => {
    try {
      if (editingEntry) {
        await api.put(`/stock-entries/${editingEntry.id}`, formData);
        showToastSuccess("Stock purchase entry updated!");
      } else {
        await api.post("/stock-entries", formData);
        showToastSuccess("Stock purchase entry recorded!");
      }
      setShowModal(false);
      setEditingEntry(null);
      afterChange();
    } catch (err) {
      showToastError(err.message || "Failed to save stock purchase entry.");
      throw err;
    }
  };

  const handleSaveInvoice = async (payload) => {
    const res = await api.post("/stock-entries/bulk", payload);
    showToastSuccess(res.message || "Purchase invoice saved");
    afterChange();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Purchases & Price Change Tracking"
        description="Record supplier invoices, track cost changes and keep FIFO lots for exact profit."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingEntry(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 font-bold"
              tooltip="Single product purchase"
            >
              <Plus className="w-4 h-4" /> Single Entry
            </Button>
            <Button onClick={() => setShowInvoice(true)} className="flex items-center gap-2 font-bold" tooltip="Multi-product supplier invoice" shortcut="Alt+Shift+N">
              <FileText className="w-4 h-4" /> New Purchase Invoice
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Purchases in view</p>
          <p className="text-xl font-black">{list.total.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Total cost</p>
          <p className="text-xl font-black">{formatCurrency(list.summary?.totalCost || 0)}</p>
        </div>
      </div>

      <Card>
        {list.error && <p className="text-xs text-red-600 mb-3">{list.error}</p>}
        <StockEntryTable
          list={list}
          onEdit={(entry) => {
            setEditingEntry(entry);
            setShowModal(true);
          }}
          onDelete={handleDelete}
          onDeleteSelected={handleDeleteSelected}
        />
      </Card>

      <StockEntryModal
        key={editingEntry ? `edit-${editingEntry.id}` : showModal ? "new" : "closed"}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEntry(null);
        }}
        onSubmit={handleSaveStockEntry}
        products={products}
        suppliers={suppliers}
        initialData={editingEntry}
      />

      <PurchaseInvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        onSubmit={handleSaveInvoice}
        products={products}
        suppliers={suppliers}
      />
    </div>
  );
}
