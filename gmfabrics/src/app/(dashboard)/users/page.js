"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UserPlus, Edit2, UserX, UserCheck, UserCog } from "lucide-react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { Tooltip } from "../../../components/common/tooltip.jsx";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { Loader } from "../../../components/common/loader.jsx";
import { formatDate } from "../../../utils/formatDate.js";
import { isValidEmail, passwordProblem } from "../../../utils/validators.js";
import { confirmAction, showToastError, showToastSuccess } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { useAuth } from "../../../context/authContext.jsx";

const EMPTY = { name: "", email: "", password: "", role: "CASHIER" };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      showToastError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (u = null) => {
    setEditing(u);
    setForm(u ? { name: u.name, email: u.email, password: "", role: u.role } : EMPTY);
    setError("");
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Name is required.");
    if (!isValidEmail(form.email)) return setError("Enter a valid email address.");
    if (!editing || form.password) {
      const problem = passwordProblem(form.password);
      if (problem) return setError(`Password: ${problem}.`);
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role, ...(form.password ? { password: form.password } : {}) };
      if (editing) await api.put(`/users/${editing.id}`, payload);
      else await api.post("/users", payload);
      showToastSuccess(editing ? "User updated. They will need to log in again." : "User created.");
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    const ok = await confirmAction(
      u.isActive ? `Deactivate ${u.name}?` : `Reactivate ${u.name}?`,
      u.isActive ? "They will be logged out and cannot sign in. Their sales history is kept." : "They will be able to sign in again.",
      u.isActive ? "Deactivate" : "Reactivate"
    );
    if (!ok) return;
    try {
      await api.put(`/users/${u.id}`, { isActive: !u.isActive });
      showToastSuccess(u.isActive ? "User deactivated." : "User reactivated.");
      load();
    } catch (err) {
      showToastError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access"
        description="Create cashier and admin logins. Cashiers can sell, take returns and khata payments, but cannot see costs, profit or settings."
        action={
          <Button onClick={() => open()} className="font-bold">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add User
          </Button>
        }
      />

      <Card>
        {loading ? (
          <Loader text="Loading users..." icon={UserCog} />
        ) : (
          <DataTable
            title="Users"
            data={users}
            searchKeys={["name", "email", "role"]}
            enableSelection={false}
            enableDateFilter={false}
            rowClassName={(u) => (u.isActive ? "" : "opacity-50")}
            columns={[
              {
                key: "name",
                label: "Name",
                render: (u) => (
                  <div>
                    <p className="font-semibold">
                      {u.name} {u.id === me?.id && <span className="text-[10px] text-zinc-400">(you)</span>}
                    </p>
                    <p className="text-[10px] text-zinc-400">{u.email}</p>
                  </div>
                ),
              },
              { key: "role", label: "Role", render: (u) => <Badge variant={u.role === "ADMIN" ? "dark" : "default"}>{u.role}</Badge> },
              { key: "isActive", label: "Status", render: (u) => (u.isActive ? <Badge variant="emerald">Active</Badge> : <Badge variant="danger">Inactive</Badge>) },
              { key: "sales", label: "Bills", render: (u) => u._count?.sales || 0 },
              { key: "createdAt", label: "Created", render: (u) => formatDate(u.createdAt) },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                cellClassName: "text-right",
                render: (u) => (
                  <div className="flex justify-end gap-1">
                    <Tooltip label="Edit / reset password">
                      <button onClick={() => open(u)} className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Edit user">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    {u.id !== me?.id && (
                      <Tooltip label={u.isActive ? "Deactivate" : "Reactivate"}>
                        <button
                          onClick={() => toggleActive(u)}
                          className={`p-1.5 rounded cursor-pointer ${u.isActive ? "text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                          aria-label={u.isActive ? "Deactivate user" : "Reactivate user"}
                        >
                          {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </Tooltip>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? `Edit ${editing.name}` : "Add User"} icon={UserCog}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input label="Full name" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          <Input label="Email (login)" type="email" value={form.email} maxLength={191} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input
            label={editing ? "New password (leave blank to keep)" : "Password"}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={form.password ? passwordProblem(form.password) : null}
            required={!editing}
          />
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {["CASHIER", "ADMIN"].map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={editing?.id === me?.id}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-50 ${
                    form.role === r ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {r === "ADMIN" ? "Admin — full access" : "Cashier — counter only"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="w-1/3" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="w-2/3 font-bold">
              {editing ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
