"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Plus, Ruler, Trash2 } from "lucide-react";
import api from "../../../services/apiService.js";

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await api.get("/units");
      if (res.data) setUnits(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post("/units", { name, symbol });
      setShowModal(false);
      setName("");
      setSymbol("");
      fetchUnits();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this unit?")) {
      try {
        await api.delete(`/units/${id}`);
        fetchUnits();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Measurement Units"
        description="Manage measurement options (guzz, metre, weight kg/grams, pieces, etc.)."
        action={
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 font-bold">
            <Plus className="w-4 h-4" /> Add Custom Unit
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading units...</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Unit Name</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-3">Products Using Unit</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-zinc-400" />
                    <span className="capitalize">{u.name}</span>
                  </td>
                  <td className="py-3 px-3 text-zinc-700 font-bold font-mono">{u.symbol || "—"}</td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {u._count?.products || 0} products
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Measurement Unit" maxWidth="max-w-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input
            label="Unit Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. yard / foot"
            required
          />
          <Input
            label="Short Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="yd"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="w-1/2" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-1/2 font-bold">
              Save Unit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
