"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Plus, Ruler, Trash2 } from "lucide-react";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";

export default function UnitsPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [allowDecimal, setAllowDecimal] = useState(true);
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
      await api.post("/units", { name, symbol, allowDecimal });
      showToastSuccess("Measurement unit added successfully!");
      setShowModal(false);
      setName("");
      setSymbol("");
      setAllowDecimal(true);
      fetchUnits();
    } catch (err) {
      setError(err.message);
      showToastError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirmDelete("Delete Unit?", "Are you sure you want to delete this measurement unit?");
    if (isConfirmed) {
      try {
        await api.delete(`/units/${id}`);
        showToastSuccess("Unit deleted successfully.");
        fetchUnits();
      } catch (err) {
        showToastError(err.message || "Failed to delete unit.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Measurement Units"
        description="Manage unit options (guzz, metre, kg, grams allow decimals e.g. 2.5 vs pieces, suits whole numbers only)."
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
                <th className="py-3 px-3">Quantity Type</th>
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
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        u.allowDecimal
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {u.allowDecimal ? "DECIMAL (e.g. 2.5)" : "WHOLE NUMBER ONLY (1, 2, 3)"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {u._count?.products || 0} products
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Measurement Unit" maxWidth="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input
            label="Unit Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. yard / suit / piece"
            required
          />
          <Input
            label="Short Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="yd"
          />

          <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <input
              type="checkbox"
              id="allowDecimal"
              checked={allowDecimal}
              onChange={(e) => setAllowDecimal(e.target.checked)}
              className="w-4 h-4 accent-zinc-900 dark:accent-zinc-100 rounded cursor-pointer"
            />
            <label htmlFor="allowDecimal" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
              Allow decimal quantities (e.g. 2.5 meters vs whole 1, 2 for suits/pieces)
            </label>
          </div>

          <div className="flex gap-2 pt-2">
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
