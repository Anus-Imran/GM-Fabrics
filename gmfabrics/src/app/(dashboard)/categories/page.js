"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Plus, Edit2, Trash2, Layers } from "lucide-react";
import { showToastSuccess, showToastError, confirmDelete } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";

import { DataTable } from "../../../components/common/dataTable.jsx";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
      } else if (res && Array.isArray(res.categories)) {
        list = res.categories;
      }
      setCategories(list);
    } catch (err) {
      console.error(err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category = null) => {
    setError("");
    if (category) {
      setEditingCategory(category);
      setName(category.name);
    } else {
      setEditingCategory(null);
      setName("");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, { name });
        showToastSuccess("Category updated successfully!");
      } else {
        await api.post("/categories", { name });
        showToastSuccess("New category added!");
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setError(err.message);
      showToastError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirmDelete("Delete Category?", "Are you sure you want to delete this category?");
    if (isConfirmed) {
      try {
        await api.delete(`/categories/${id}`);
        showToastSuccess("Category deleted successfully.");
        fetchCategories();
      } catch (err) {
        showToastError(err.message || "Failed to delete category.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fabric Categories"
        description="Classify your fabrics (Lawn, Cotton, Silk, Chiffon, Linen, Velvet, etc.)."
        action={
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 font-bold cursor-pointer">
            <Plus className="w-4 h-4" /> Add New Category
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-400">Loading categories...</div>
        ) : (
          <DataTable
            title="Fabric_Categories"
            columns={[
              {
                key: "name",
                label: "Category Name",
                render: (c) => (
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{c.name}</span>
                  </div>
                ),
              },
              {
                key: "productsCount",
                label: "Associated Products",
                render: (c) => `${c._count?.products || 0} products`,
              },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                cellClassName: "text-right",
                render: (c) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenModal(c)}
                      className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={categories.map((c) => ({
              ...c,
              productsCount: c._count?.products || 0,
            }))}
            searchKeys={["name"]}
            dateKey="createdAt"
            onDeleteSelected={async (ids) => {
              for (const id of ids) {
                await api.delete(`/categories/${id}`);
              }
              showToastSuccess(`Deleted ${ids.length} category(ies)!`);
              fetchCategories();
            }}
            enableSelection={true}
            enableDateFilter={false}
          />
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? "Edit Category" : "Add New Category"}
        maxWidth="max-w-xs"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input
            label="Category Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Silk / Jacquard"
            required
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
