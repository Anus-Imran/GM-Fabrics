"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { CustomerTable } from "../../../components/customers/customerTable.jsx";
import { CustomerModal } from "../../../components/customers/customerModal.jsx";
import { KhataSettleModal } from "../../../components/customers/khataSettleModal.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Plus, Search } from "lucide-react";
import { showToastSuccess, showToastError } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { Loader } from "../../../components/common/loader.jsx";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleCustomer, setSettleCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customers");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setCustomers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        showToastSuccess("Customer profile updated!");
      } else {
        await api.post("/customers", formData);
        showToastSuccess("New customer added!");
      }
      fetchCustomers();
    } catch (err) {
      showToastError(err.message || "Failed to save customer.");
    }
  };

  const handleSettleBalance = async (customerId, payload) => {
    try {
      await api.put(`/customers/${customerId}/settle`, payload);
      showToastSuccess("Khata payment settled successfully!");
      fetchCustomers();
    } catch (err) {
      showToastError(err.message || "Failed to settle Khata balance.");
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.cnic && c.cnic.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Accounts & Khata Balances"
        description="Manage customer profiles, contact info, and track outstanding Khata credit balances."
        action={
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setShowCustomerModal(true);
            }}
            className="flex items-center gap-2 font-bold"
          >
            <Plus className="w-4 h-4" /> Add New Customer
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Loader text="Loading customer khata accounts..." />
        ) : (
          <CustomerTable
            customers={customers}
            onEdit={(cust) => {
              setEditingCustomer(cust);
              setShowCustomerModal(true);
            }}
            onSettleKhata={(cust) => {
              setSettleCustomer(cust);
              setShowSettleModal(true);
            }}
          />
        )}
      </Card>

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingCustomer}
      />

      <KhataSettleModal
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        onSettle={handleSettleBalance}
        customer={settleCustomer}
      />
    </div>
  );
}
