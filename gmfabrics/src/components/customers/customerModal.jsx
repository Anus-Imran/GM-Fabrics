"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";

export const CustomerModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    address: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        phone: initialData.phone || "",
        cnic: initialData.cnic || "",
        address: initialData.address || "",
        notes: initialData.notes || "",
      });
    } else {
      setFormData({ name: "", phone: "", cnic: "", address: "", notes: "" });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name) {
      setError("Customer name is required.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save customer account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Customer Account" : "Add New Customer Account"}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <Input
          label="Customer Full Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Muhammad Ahmed Khan"
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
            label="CNIC Number"
            value={formData.cnic}
            onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
            placeholder="35201-1234567-1"
          />
        </div>

        <Input
          label="Address / Location"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Gulberg III, Lahore"
        />

        <Input
          label="Notes / Khata Terms"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Regular retail buyer"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-2/3 font-bold">
            {loading ? "Saving..." : initialData ? "Update Customer" : "Create Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
