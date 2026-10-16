"use client";

import React, { useState } from "react";
import { KeyRound } from "lucide-react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Button } from "../../../components/common/button.jsx";
import { passwordProblem } from "../../../utils/validators.js";
import { showToastSuccess } from "../../../utils/alerts.js";
import api from "../../../services/apiService.js";
import { useAuth } from "../../../context/authContext.jsx";

export default function AccountPage() {
  const { user, replaceToken } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const problem = passwordProblem(form.newPassword);
    if (problem) return setError(`New password: ${problem}.`);
    if (form.newPassword !== form.confirm) return setError("New passwords do not match.");
    setSaving(true);
    try {
      const res = await api.post("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (res.data?.token) replaceToken(res.data.token);
      showToastSuccess("Password changed. Other devices are signed out.");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Account" description={`${user?.name} • ${user?.email} • ${user?.role}`} />
      <Card>
        <form onSubmit={submit} className="max-w-md space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            <h3 className="font-black text-sm">Change password</h3>
          </div>
          {error && <div role="alert" className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{error}</div>}
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            required
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            error={form.newPassword ? passwordProblem(form.newPassword) : null}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            error={form.confirm && form.confirm !== form.newPassword ? "Does not match" : null}
            required
          />
          <Button type="submit" loading={saving} className="w-full font-bold">
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
