"use client";

import React, { useEffect, useRef, useState } from "react";
import { Barcode, Printer } from "lucide-react";
import { Modal } from "../common/modal.jsx";
import { Button } from "../common/button.jsx";
import { Input } from "../common/input.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Prints Code128 barcode labels (38×25mm) for a product. Uses SKU when there is no barcode. */
export const BarcodeLabelModal = ({ isOpen, onClose, product }) => {
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const svgRef = useRef(null);

  const code = product?.barcode || product?.sku || (product ? `GM${String(product.id).padStart(6, "0")}` : "");

  useEffect(() => {
    if (!isOpen || !product) return;
    setError("");
    let cancelled = false;
    import("jsbarcode")
      .then(({ default: JsBarcode }) => {
        if (cancelled || !svgRef.current) return;
        JsBarcode(svgRef.current, code, { format: "CODE128", width: 1.6, height: 40, fontSize: 12, margin: 0, displayValue: true });
        setSvg(svgRef.current.outerHTML);
      })
      .catch((err) => setError(`Could not draw barcode: ${err.message}`));
    return () => {
      cancelled = true;
    };
  }, [isOpen, product, code]);

  if (!product) return null;

  const print = () => {
    const n = Math.min(Math.max(parseInt(copies, 10) || 1, 1), 200);
    const label = `<div class="label"><div class="name">${escapeHtml(product.name)}</div>${svg}${
      showPrice ? `<div class="price">${escapeHtml(formatCurrency(product.salePrice))} / ${escapeHtml(product.unit?.symbol || "")}</div>` : ""
    }</div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
      @page { size: 38mm 25mm; margin: 0 }
      body { margin: 0; font-family: Arial, sans-serif }
      .label { width: 38mm; height: 25mm; box-sizing: border-box; padding: 1mm; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-after: always; overflow: hidden }
      .name { font-size: 8px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 36mm }
      .price { font-size: 9px; font-weight: bold }
      svg { max-width: 36mm; height: 14mm }
    </style></head><body>${label.repeat(n)}</body></html>`;
    const w = window.open("", "_blank", "width=400,height=600");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Barcode Labels — ${product.name}`} icon={Barcode} maxWidth="max-w-sm">
      <div className="space-y-4">
        {!product.barcode && (
          <p className="text-[11px] text-amber-600 font-semibold">
            This product has no barcode — label uses {product.sku ? "its SKU" : `code ${code}`}. Save it as the product barcode so scanning works.
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-zinc-200 text-black">
          <p className="text-[11px] font-bold truncate max-w-full">{product.name}</p>
          <svg ref={svgRef} />
          {showPrice && <p className="text-xs font-bold">{formatCurrency(product.salePrice)}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <Input label="Copies" type="number" min="1" max="200" value={copies} onChange={(e) => setCopies(e.target.value)} />
          <label className="flex items-center gap-2 text-xs pb-2 cursor-pointer">
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Show price
          </label>
        </div>
        <Button onClick={print} className="w-full font-bold" disabled={!svg}>
          <Printer className="w-4 h-4 mr-1.5" /> Print Labels
        </Button>
      </div>
    </Modal>
  );
};
