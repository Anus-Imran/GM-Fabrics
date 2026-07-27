"use client";

import React from "react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { Printer } from "lucide-react";
import api from "../../services/apiService.js";

export const ReceiptModal = ({ isOpen, onClose, sale }) => {
  if (!sale || !sale.receipt) return null;

  const handlePrint = async () => {
    try {
      await api.post(`/receipts/${sale.id}/print`);
    } catch (err) {
      console.warn("Print count increment error:", err);
    }

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(sale.receipt.receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receipt — ${sale.saleNumber}`} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Receipt HTML Preview */}
        <div className="bg-white p-3 rounded-lg border border-zinc-200 overflow-hidden text-black font-mono shadow-inner max-h-96 overflow-y-auto">
          <div dangerouslySetInnerHTML={{ __html: sale.receipt.receiptHtml }} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="w-2/3 flex items-center justify-center gap-2 font-bold">
            <Printer className="w-4 h-4" />
            <span>Print 80mm Thermal Receipt</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
