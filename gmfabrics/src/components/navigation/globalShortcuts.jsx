"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";
import { useHotkeys } from "../../hooks/useHotkeys.js";
import { useAuth } from "../../context/authContext.jsx";
import {
  ALL_NAV_ITEMS,
  GLOBAL_SHORTCUTS,
  POS_SHORTCUTS,
  PAYMENT_SHORTCUTS,
  RECEIPT_SHORTCUTS,
} from "../../config/navigation.js";
import { Modal } from "../common/modal.jsx";
import { Kbd } from "../common/tooltip.jsx";

const Section = ({ title, rows }) => (
  <div>
    <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">{title}</h4>
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl">
      {rows.map((r) => (
        <div key={r.combo + r.description} className="flex items-center justify-between px-3 py-2 text-xs">
          <span className="text-zinc-600 dark:text-zinc-300">{r.description}</span>
          <Kbd combo={r.combo} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * App-wide keyboard shortcuts: page navigation, "/" to focus search, Shift+? for help.
 * Also renders the shortcuts help panel (opened from the user menu or Shift+?).
 */
export const GlobalShortcuts = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [showHelp, setShowHelp] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter((i) => i.shortcut && (!i.adminOnly || user?.role === "ADMIN"));

  const bindings = Object.fromEntries(navItems.map((i) => [i.shortcut, () => router.push(i.href)]));

  bindings["Shift+?"] = () => setShowHelp((v) => !v);
  bindings["/"] = () => {
    const input = document.querySelector(
      'main input[type="text"]:not([disabled]), main input[type="search"]:not([disabled]), main input:not([type]):not([disabled])'
    );
    if (!input) return false;
    input.focus();
    input.select?.();
  };

  useHotkeys(bindings);

  // Lets other components (user menu, top bar) open the help panel.
  useEffect(() => {
    window.__gmOpenShortcuts = () => setShowHelp(true);
    return () => {
      delete window.__gmOpenShortcuts;
    };
  }, []);

  return (
    <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Keyboard Shortcuts" icon={Keyboard} maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Section title="Anywhere" rows={GLOBAL_SHORTCUTS} />
          <Section title="Go to page" rows={navItems.map((i) => ({ combo: i.shortcut, description: i.label }))} />
        </div>
        <div className="space-y-5">
          <Section title="POS counter" rows={POS_SHORTCUTS} />
          <Section title="Payment dialog" rows={PAYMENT_SHORTCUTS} />
          <Section title="Receipt dialog" rows={RECEIPT_SHORTCUTS} />
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 mt-4">Tip: hover any button to see its shortcut.</p>
    </Modal>
  );
};
