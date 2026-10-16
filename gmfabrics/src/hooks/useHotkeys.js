"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Keyboard shortcut hook.
 *
 *   useHotkeys({ "F4": openPayment, "Alt+Shift+D": goDashboard }, { enabled: true })
 *
 * Combos are written as "Ctrl+Shift+K", "Alt+1", "F2", "Escape", "/".
 * While the user is typing in an input, plain keys are ignored; function keys and
 * combos that use Ctrl/Alt still fire so the counter can be driven from the keyboard.
 */

const normalizeKey = (key) => {
  if (!key) return "";
  if (key === " ") return "Space";
  if (key === "Esc") return "Escape";
  if (key.length === 1) return key.toUpperCase();
  return key;
};

const KEY_CODE_FALLBACK = /^(Digit|Key)(.)$/;

export const eventToCombo = (event) => {
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  // With Alt/Shift held, event.key can become a symbol (e.g. Alt+Shift+D on some layouts) —
  // event.code gives the physical key.
  let key = normalizeKey(event.key);
  const codeMatch = KEY_CODE_FALLBACK.exec(event.code || "");
  if ((event.altKey || event.ctrlKey || event.metaKey) && codeMatch) key = codeMatch[2].toUpperCase();
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return "";
  parts.push(key);
  return parts.join("+");
};

const normalizeCombo = (combo) =>
  combo
    .split("+")
    .map((p) => p.trim())
    .map((p) => (p.toLowerCase() === "cmd" || p.toLowerCase() === "meta" ? "Ctrl" : p))
    .map((p) => (p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .sort((a, b) => {
      const order = { Ctrl: 0, Alt: 1, Shift: 2 };
      return (order[a] ?? 3) - (order[b] ?? 3);
    })
    .join("+");

const isTypingTarget = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

const firesWhileTyping = (combo) => /^F\d{1,2}$/.test(combo) || combo === "Escape" || /(Ctrl|Alt)\+/.test(combo);

export const useHotkeys = (bindings, { enabled = true, allowInInputs = false } = {}) => {
  const bindingsRef = useRef(bindings);
  useLayoutEffect(() => {
    bindingsRef.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;

    const handler = (event) => {
      const combo = eventToCombo(event);
      if (!combo) return;

      const map = bindingsRef.current || {};
      const entry = Object.entries(map).find(([k]) => normalizeCombo(k) === combo);
      if (!entry) return;

      if (isTypingTarget(event.target) && !allowInInputs && !firesWhileTyping(combo)) return;

      const fn = entry[1];
      if (typeof fn !== "function") return;
      const result = fn(event);
      // Return false from a handler to let the browser keep its default behaviour.
      if (result !== false) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, allowInInputs]);
};

/** Human readable label for a combo, e.g. "Alt+Shift+D" → "Alt ⇧ D". */
export const comboLabel = (combo) => (combo ? combo.replace(/Shift/g, "⇧").replace(/\+/g, " + ") : "");
