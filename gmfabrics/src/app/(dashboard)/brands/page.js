"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { Loader } from "../../../components/common/loader.jsx";

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await api.get("/brands");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBrands(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (brand = null) => {
    setError("");
    if (brand) {
      setEditingBrand(brand);
      setName(brand.name);
      setCountry(brand.country || "Pakistan");
    } else {
      setEditingBrand(null);
      setName("");
      setCountry("Pakistan");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand.id}`, { name, country });
        showToastSuccess("Brand updated successfully!");
      } else {
        await api.post("/brands", { name, country });
        showToastSuccess("New brand added!");
      }
      setShowModal(false);
      fetchBrands();
    } catch (err) {
      setError(err.message);
      showToastError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirmDelete("Delete Brand?", "Are you sure you want to delete this brand label?");
    if (isConfirmed) {
      try {
        await api.delete(`/brands/${id}`);
        showToastSuccess("Brand deleted successfully.");
        fetchBrands();
      } catch (err) {
        showToastError(err.message || "Failed to delete brand.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fabric Brands & Labels"
        description="Manage manufacturer brands (Gul Ahmed, Bonanza, Al-Karam, Sapphire, Khaadi, J., etc.)."
        action={
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 font-bold">
            <Plus className="w-4 h-4" /> Add New Brand
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Loader text="Loading fabric brands & labels..." />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Brand Name</th>
                <th className="py-3 px-3">Country</th>
                <th className="py-3 px-3">Products</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-zinc-400" />
                    <span>{b.name}</span>
                  </td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{b.country || "—"}</td>
                  <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                    {b._count?.products || 0} products
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenModal(b)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
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
        title={editingBrand ? "Edit Brand" : "Add New Brand"}
        maxWidth="max-w-xs"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input
            label="Brand Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maria.B / Sana Safinaz"
            required
          />
          <Input
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Pakistan"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="w-1/2" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-1/2 font-bold">
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
