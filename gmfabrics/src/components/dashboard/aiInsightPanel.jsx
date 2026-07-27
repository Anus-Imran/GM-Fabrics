"use client";

import React, { useState, useEffect } from "react";
import { Bot, Sparkles, RefreshCw } from "lucide-react";
import api from "../../services/apiService.js";
import { Button } from "../common/button.jsx";

export const AiInsightPanel = () => {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ai/daily-summary");
      if (res.data?.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      setSummary("Connect OpenAI API key in backend .env to enable real-time GPT-4o executive daily summaries.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 text-white rounded-xl p-5 border border-zinc-800 shadow-md">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-100">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">AI Business Agent</h3>
            <p className="text-[10px] text-zinc-500">Daily Executive Summary</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSummary} disabled={loading} className="p-1 text-zinc-400 hover:text-white">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-4">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Analyzing today's sales & expenses...</span>
          </div>
        ) : (
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">{summary}</p>
        )}
      </div>
    </div>
  );
};
