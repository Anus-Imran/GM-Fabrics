"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { StockEntryTable } from "../../../components/inventory/stockEntryTable.jsx";
import { StockEntryModal } from "../../../components/inventory/stockEntryModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Plus } from "lucide-react";
import { showToastSuccess, showToastError } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";

export default function StockEntriesPage() {
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entryRes, prodRes, supRes] = await Promise.all([
        api.get("/stock-entries"),
        api.get("/products"),
        api.get("/suppliers"),
      ]);
      if (entryRes.data) setEntries(entryRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (supRes.data) setSuppliers(supRes.data);
    } catch (err) {
      console.error("Stock entries error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStockEntry = async (formData) => {
    try {
      await api.post("/stock-entries", formData);
      showToastSuccess("Stock purchase entry recorded & inventory updated!");
      fetchData();
    } catch (err) {
      showToastError(err.message || "Failed to record stock purchase entry.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Purchases & Price Change Tracking"
        description="Record inventory purchases from vendors and automatically track cost price changes over time."
        action={
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 font-bold">
            <Plus className="w-4 h-4" /> Record New Purchase Entry
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading purchase entries...</div>
        ) : (
          <StockEntryTable entries={entries} />
        )}
      </Card>

      <StockEntryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateStockEntry}
        products={products}
        suppliers={suppliers}
      />
    </div>
  );
}
