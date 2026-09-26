"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { StockEntryTable } from "../../../components/inventory/stockEntryTable.jsx";
import { StockEntryModal } from "../../../components/inventory/stockEntryModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Plus, Package } from "lucide-react";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { Loader } from "../../../components/common/loader.jsx";

export default function StockEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const reloadData = async () => {
    setLoading(true);
    try {
      const [entryRes, prodRes, supRes] = await Promise.all([
        api.get("/stock-entries"),
        api.get("/products"),
        api.get("/suppliers"),
      ]);
      setEntries(Array.isArray(entryRes?.data) ? entryRes.data : Array.isArray(entryRes) ? entryRes : []);
      setProducts(Array.isArray(prodRes?.data) ? prodRes.data : Array.isArray(prodRes) ? prodRes : []);
      setSuppliers(Array.isArray(supRes?.data) ? supRes.data : Array.isArray(supRes) ? supRes : []);
    } catch (err) {
      console.error("Stock entries error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/stock-entries"),
      api.get("/products"),
      api.get("/suppliers"),
    ])
      .then(([entryRes, prodRes, supRes]) => {
        if (!active) return;
        setEntries(Array.isArray(entryRes?.data) ? entryRes.data : Array.isArray(entryRes) ? entryRes : []);
        setProducts(Array.isArray(prodRes?.data) ? prodRes.data : Array.isArray(prodRes) ? prodRes : []);
        setSuppliers(Array.isArray(supRes?.data) ? supRes.data : Array.isArray(supRes) ? supRes : []);
      })
      .catch((err) => {
        console.error("Stock entries error:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);




  const handleOpenCreate = () => {
    setEditingEntry(null);
    setShowModal(true);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirmDelete(
      "Delete Stock Purchase Lot?",
      "Are you sure you want to delete this purchase entry? Inventory stock, FIFO batches, and latest cost prices will be re-synchronized."
    );
    if (isConfirmed) {
      try {
        await api.delete(`/stock-entries/${id}`);
        showToastSuccess("Stock purchase entry deleted successfully.");
        reloadData();
      } catch (err) {
        showToastError(err.message || "Failed to delete stock purchase entry.");
      }
    }
  };

  const handleDeleteSelected = async (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return;
    const isConfirmed = await confirmDelete(
      "Delete Selected Purchase Lots?",
      `Are you sure you want to delete ${selectedIds.length} purchase record(s)? Unused inventory batches will be removed.`
    );
    if (isConfirmed) {
      try {
        await api.delete("/stock-entries", { data: { ids: selectedIds } });
        showToastSuccess("Selected stock purchase entries deleted.");
        reloadData();
      } catch (err) {
        showToastError(err.message || "Failed to delete selected purchase entries.");
      }
    }
  };

  const handleSaveStockEntry = async (formData) => {
    try {
      if (editingEntry) {
        await api.put(`/stock-entries/${editingEntry.id}`, formData);
        showToastSuccess("Stock purchase entry updated & inventory synchronized!");
      } else {
        await api.post("/stock-entries", formData);
        showToastSuccess("Stock purchase entry recorded & inventory updated!");
      }
      setShowModal(false);
      setEditingEntry(null);
      reloadData();
    } catch (err) {
      showToastError(err.message || "Failed to save stock purchase entry.");
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Purchases & Price Change Tracking"
        description="Record inventory purchases from vendors and automatically track cost price changes over time."
        action={
          <Button onClick={handleOpenCreate} className="flex items-center gap-2 font-bold cursor-pointer">
            <Plus className="w-4 h-4" /> Record New Purchase Entry
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Loader text="Loading stock purchase entries..." icon={Package} />
        ) : (
          <StockEntryTable
            entries={entries}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDeleteSelected={handleDeleteSelected}
          />
        )}
      </Card>

      <StockEntryModal
        key={editingEntry ? `edit-${editingEntry.id}` : (showModal ? "new" : "closed")}
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
    </div>
  );
}

