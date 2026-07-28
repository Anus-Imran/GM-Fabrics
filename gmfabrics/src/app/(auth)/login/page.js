"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/authContext.jsx";
import { Input } from "../../../components/common/input.jsx";
import { Button } from "../../../components/common/button.jsx";
import { showToastSuccess, showToastError } from "../../../utils/alerts.js";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@gmfabrics.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const resUser = await login(email, password);
      showToastSuccess(`Welcome back, ${resUser?.name || "User"}!`);
      router.push("/dashboard");
    } catch (err) {
      const msg = err.message || "Invalid login credentials.";
      setError(msg);
      showToastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-black text-xl mx-auto mb-3">
            GM
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            GM FABRICS POS
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Sign in to access Point of Sale & Inventory System
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-xs bg-red-50 text-red-600 rounded-lg border border-red-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gmfabrics.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" disabled={loading} size="lg" className="w-full font-bold mt-2">
            {loading ? "Signing in..." : "Sign In to Dashboard"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-400">
            Demo Credentials: <br />
            <strong className="text-zinc-700 dark:text-zinc-300">Admin:</strong> admin@gmfabrics.com / admin123 <br />
            <strong className="text-zinc-700 dark:text-zinc-300">Cashier:</strong> cashier@gmfabrics.com / cashier123
          </p>
        </div>
      </div>
    </div>
  );
}
