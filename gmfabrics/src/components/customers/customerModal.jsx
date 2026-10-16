"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../common/modal.jsx";
import { Input } from "../common/input.jsx";
import { Button } from "../common/button.jsx";
import { maskPhone, maskCnic, isValidPhone, isValidCnic } from "../../utils/validators.js";

const EMPTY = { name: "", phone: "", cnic: "", address: "", notes: "" };

export const CustomerModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData(
      initialData
        ? {
            name: initialData.name || "",
            phone: maskPhone(initialData.phone || ""),
            cnic: initialData.cnic || "",
            address: initialData.address || "",
            notes: initialData.notes || "",
          }
        : EMPTY
    );
    setTouched({});
    setError("");
  }, [initialData, isOpen]);

  const errors = {
    name: !formData.name.trim() ? "Customer name is required" : null,
    phone: !isValidPhone(formData.phone) ? "Enter a valid number, e.g. 0300-1234567" : null,
    cnic: !isValidCnic(formData.cnic) ? "CNIC must be 13 digits, e.g. 35202-1234567-1" : null,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTouched({ name: true, phone: true, cnic: true });
    if (errors.name || errors.phone || errors.cnic) return;

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        phone: formData.phone ? formData.phone.replace(/\D/g, "") : null,
        cnic: formData.cnic || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save customer account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Customer Account" : "Add New Customer Account"} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}

        <Input
          label="Customer Full Name"
          value={formData.name}
          maxLength={150}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={touched.name ? errors.name : null}
          placeholder="e.g. Muhammad Ahmed Khan"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            type="tel"
            inputMode="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            error={touched.phone ? errors.phone : null}
            placeholder="0300-1234567"
          />
          <Input
            label="CNIC Number"
            inputMode="numeric"
            value={formData.cnic}
            onChange={(e) => setFormData({ ...formData, cnic: maskCnic(e.target.value) })}
            onBlur={() => setTouched((t) => ({ ...t, cnic: true }))}
            error={touched.cnic ? errors.cnic : null}
            placeholder="35202-1234567-1"
          />
        </div>

        <Input
          label="Address / Location"
          value={formData.address}
          maxLength={300}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Gulberg III, Lahore"
        />

        <Input
          label="Notes / Khata Terms"
          value={formData.notes}
          maxLength={1000}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Regular retail buyer"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} loadingText="Saving..." className="w-2/3 font-bold">
            {initialData ? "Update Customer" : "Create Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
