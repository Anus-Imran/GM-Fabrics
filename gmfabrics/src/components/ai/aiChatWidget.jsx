"use client";

import React, { useState } from "react";
import { Send, Bot, Sparkles, User } from "lucide-react";
import api from "../../services/apiService.js";

export const AiChatWidget = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am your GM Fabrics Agentic AI Assistant. Ask me anything about your POS sales, low stock, revenue, or customer Khata balances!",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userPrompt = query.trim();
    setQuery("");

    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setLoading(true);

    try {
      const res = await api.post("/ai/query", { prompt: userPrompt });
      if (res.data?.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.data.answer },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I encountered an error analyzing business context. Ensure backend is running and OpenAI key is configured.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col h-[500px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-950 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-800">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">GM Fabrics AI Chat Agent</h3>
            <p className="text-[10px] text-zinc-400">Powered by OpenAI GPT-4o Agentic Framework</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
          ONLINE
        </span>
      </div>

      {/* Messages Window */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50 dark:bg-zinc-950/40">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-zinc-900 text-white font-medium"
                  : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 shadow-xs"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI is querying live POS database & generating answer...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question (e.g. What was today's total revenue?)..."
          className="flex-1 text-xs p-2.5 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-bold"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
