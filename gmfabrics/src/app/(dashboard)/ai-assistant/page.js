"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card, CardHeader } from "../../../components/common/card.jsx";
import { AiChatWidget } from "../../../components/ai/aiChatWidget.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Bot, AlertCircle, TrendingUp, Users, ShieldAlert, Sparkles } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import api from "../../../services/apiService.js";

export default function AiAssistantPage() {
  const [lowStockSuggestions, setLowStockSuggestions] = useState([]);
  const [demandForecasts, setDemandForecasts] = useState([]);
  const [customerInsights, setCustomerInsights] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runAiAgents();
  }, []);

  const runAiAgents = async () => {
    setLoading(true);
    try {
      const [reorderRes, forecastRes, customerRes, anomalyRes] = await Promise.all([
        api.get("/ai/low-stock-suggestions"),
        api.get("/ai/demand-forecast"),
        api.get("/ai/customer-insights"),
        api.post("/ai/anomaly-check"),
      ]);

      if (reorderRes.data) setLowStockSuggestions(reorderRes.data);
      if (forecastRes.data) setDemandForecasts(forecastRes.data);
      if (customerRes.data) setCustomerInsights(customerRes.data);
      if (anomalyRes.data) setAnomalies(anomalyRes.data);
    } catch (err) {
      console.error("AI Agents error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentic AI Business Intelligence Assistant"
        description="Autonomous AI agents monitoring low stock reorders, demand forecasting, customer behavior, and anomaly detection."
        action={
          <Button onClick={runAiAgents} disabled={loading} className="flex items-center gap-2 font-bold">
            <Sparkles className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Run All AI Agents
          </Button>
        }
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Natural Language Query Chat Widget */}
        <div>
          <AiChatWidget />
        </div>

        {/* Agent 1: Low Stock Reorder Suggestions */}
        <Card>
          <CardHeader title="Agent 1: Low Stock Reorder Suggestions" subtitle="Calculates daily velocity & suggests order quantities" />
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {lowStockSuggestions.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">All inventory stock levels are healthy.</p>
            ) : (
              lowStockSuggestions.map((s, idx) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                  <div className="flex justify-between items-start font-bold">
                    <span className="text-zinc-900 dark:text-zinc-100">{s.product.name}</span>
                    <Badge variant="warning">Reorder Qty: {s.suggestedReorderQuantity}</Badge>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 text-[11px] leading-relaxed">{s.recommendation}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Agent 2 & 3: Demand Forecast & Customer Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent 3: Demand Forecasting */}
        <Card>
          <CardHeader title="Agent 3: Demand Forecasting Agent" subtitle="30-day sales trend & predicted next 30-day demand" />
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80 overflow-y-auto">
            {demandForecasts.slice(0, 8).map((f) => (
              <div key={f.product.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{f.product.name}</p>
                  <p className="text-[10px] text-zinc-500">Past 30d Sales: {f.quantitySoldLast30Days} {f.product.unit?.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">
                    Est. Demand: {f.predictedDemandNext30Days} {f.product.unit?.symbol}
                  </p>
                  <Badge variant={f.trend === "HIGH_DEMAND" ? "success" : "default"}>
                    {f.trend}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Agent 4: Customer Behavior & Khata Alert */}
        <Card>
          <CardHeader title="Agent 4: Customer Segment & Khata Agent" subtitle="Identifies credit risk and inactive customer accounts" />
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80 overflow-y-auto">
            {customerInsights.slice(0, 8).map((ci) => (
              <div key={ci.customer.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{ci.customer.name}</p>
                  <p className="text-[10px] text-amber-600 font-medium">{ci.actionItem}</p>
                </div>
                <Badge variant={ci.segment === "HIGH_CREDIT_RISK" ? "danger" : "default"}>
                  {ci.segment}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Agent 6: Anomaly & Loss Prevention */}
      <Card>
        <CardHeader title="Agent 6: Anomaly & Loss Prevention Agent" subtitle="Scans recent sales for excessive discounts or unusual transaction sizes" />
        <div className="space-y-2">
          {anomalies.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No transaction anomalies detected in the last 7 days.</p>
          ) : (
            anomalies.map((a, idx) => (
              <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{a.saleNumber} — {a.type}</p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{a.details}</p>
                  </div>
                </div>
                <Badge variant="warning">{a.severity}</Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
