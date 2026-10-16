"use client";

import React from "react";
import { PauseCircle, Trash2, PlayCircle } from "lucide-react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { useCart, priceLine } from "../../context/cartContext.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";

export const HeldBillsModal = ({ isOpen, onClose }) => {
  const { heldBills, recallHeldBill, deleteHeldBill } = useCart();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Held Bills" icon={PauseCircle} maxWidth="max-w-lg">
      {heldBills.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-8">No bills on hold. Press F8 to park the current bill.</p>
      ) : (
        <div className="space-y-2">
          {heldBills.map((bill) => {
            const total = bill.lines.reduce((s, l) => s + priceLine(l).subtotal, 0);
            return (
              <div
                key={bill.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{bill.label}</p>
                  <p className="text-[11px] text-zinc-500">
                    {bill.lines.length} item(s) • {formatCurrency(total)} •{" "}
                    {new Date(bill.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      recallHeldBill(bill.id);
                      onClose();
                    }}
                    tooltip="Load into cart (current cart is held)"
                  >
                    <PlayCircle className="w-3.5 h-3.5 mr-1" /> Resume
                  </Button>
                  <button
                    onClick={() => deleteHeldBill(bill.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    aria-label="Discard held bill"
                    title="Discard"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-zinc-400 pt-1">Held bills are saved on this computer only. Stock is not reserved.</p>
        </div>
      )}
    </Modal>
  );
};
