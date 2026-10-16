"use client";

import React, { useEffect, useRef } from "react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { Printer, MessageCircle, ShoppingCart } from "lucide-react";
import { useHotkeys } from "../../hooks/useHotkeys.js";
import { printReceiptHtml, shareSaleOnWhatsApp } from "../../utils/printReceipt.js";

export const ReceiptModal = ({ isOpen, onClose, sale, autoPrint = false }) => {
  const printedFor = useRef(null);
  const html = sale?.receipt?.receiptHtml;

  const handlePrint = () => {
    if (html) printReceiptHtml(html, sale.id);
  };

  useEffect(() => {
    if (isOpen && autoPrint && sale && printedFor.current !== sale.id) {
      printedFor.current = sale.id;
      handlePrint();
    }
  });

  useHotkeys(
    {
      "Ctrl+P": handlePrint,
      "Alt+W": () => sale && shareSaleOnWhatsApp(sale),
      "Alt+N": onClose,
    },
    { enabled: isOpen && !!sale }
  );

  if (!sale || !html) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receipt — ${sale.saleNumber}`} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Rendered in a sandboxed iframe so receipt styles never leak into the app */}
        <iframe
          title={`Receipt ${sale.saleNumber}`}
          srcDoc={html}
          sandbox=""
          className="w-full h-96 bg-white rounded-lg border border-zinc-200"
        />

        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button variant="outline" onClick={onClose} tooltip="Start a new sale" shortcut="Alt+N" className="w-full">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> New
          </Button>
          <Button
            variant="outline"
            onClick={() => shareSaleOnWhatsApp(sale)}
            tooltip="Send bill on WhatsApp"
            shortcut="Alt+W"
            className="w-full text-emerald-700 dark:text-emerald-400"
          >
            <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
          </Button>
          <Button onClick={handlePrint} tooltip="Print 80mm receipt" shortcut="Ctrl+P" className="w-full font-bold">
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
        </div>
      </div>
    </Modal>
  );
};
