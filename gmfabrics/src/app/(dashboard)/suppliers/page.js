"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";
import api from "../../../services/apiService.js";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "", address: "", city: "", notes: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers");
      if (res.data) setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (sup = null) => {
    setError("");
    if (sup) {
      setEditingSupplier(sup);
      setFormData({
        name: sup.name || "",
        phone: sup.phone || "",
        address: sup.address || "",
        city: sup.city || "",
        notes: sup.notes || "",
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: "", phone: "", address: "", city: "", notes: "" });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
      } else {
        await api.post("/suppliers", formData);
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete supplier profile?")) {
      try {
        await api.delete(`/suppliers/${id}`);
        fetchSuppliers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers & Fabric Vendors"
        description="Manage profiles of textile mills, wholesalers, and fabric suppliers."
        action={
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 font-bold">
            <Plus className="w-4 h-4" /> Add New Supplier
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading suppliers...</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">City / Address</th>
                <th className="py-3 px-3">Purchases</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-zinc-400" />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-700">{s.phone || "—"}</td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {s.city ? `${s.city} ${s.address ? `(${s.address})` : ""}` : s.address || "—"}
                  </td>
                  <td className="py-3 px-3 text-zinc-600 font-medium">
                    {s._count?.stockEntries || 0} entries
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenModal(s)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input
            label="Supplier Company / Vendor Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Faisalabad Textile Mills"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="03001234567"
            />
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Faisalabad / Lahore"
            />
          </div>
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Cloth Market, Mill Stop"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="w-1/2" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-1/2 font-bold">
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
