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
      if (res.data) setCustomers(res.data);
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
        <div className="mb-4 relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none"
          />
        </div>

        {loading ? (
          <Loader text="Loading customer khata accounts..." />
        ) : (
          <CustomerTable
            customers={filtered}
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
