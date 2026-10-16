"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Button } from "../../../components/common/button.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { Modal } from "../../../components/common/modal.jsx";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { StockAdjustModal } from "../../../components/products/stockAdjustModal.jsx";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDateTime } from "../../../utils/formatDate.js";
import api from "../../../services/apiService.js";
import { useServerList } from "../../../hooks/useServerList.js";
import { useHotkeys } from "../../../hooks/useHotkeys.js";

const REASON_VARIANT = { DAMAGE: "danger", SHRINKAGE: "amber", COUNT_CORRECTION: "info", FOUND: "emerald", OPENING: "default", OTHER: "default" };

export default function StockAdjustmentsPage() {
  const [reason, setReason] = useState("");
  const list = useServerList("/stock-adjustments", { params: { reason } });
  const [products, setProducts] = useState([]);
  const [picker, setPicker] = useState(false);
  const [productId, setProductId] = useState("");
  const [adjustProduct, setAdjustProduct] = useState(null);

  useEffect(() => {
    api.get("/products", { params: { view: "pos" } }).then((r) => setProducts(r.data || [])).catch(() => {});
  }, []);

  useHotkeys({ "Alt+Shift+N": () => setPicker(true) }, { enabled: !picker && !adjustProduct });

  const loss = list.items.reduce((s, a) => s + (a.valueImpact < 0 ? a.valueImpact : 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Every manual stock change — damage, cutting loss, stock count corrections — with who did it and its cost impact."
        action={
          <Button onClick={() => setPicker(true)} className="font-bold" tooltip="New adjustment" shortcut="Alt+Shift+N">
            <Plus className="w-4 h-4 mr-1" /> New Adjustment
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
          <p className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">Stock loss (this page, at cost)</p>
          <p className="text-xl font-black text-rose-700 dark:text-rose-300">{formatCurrency(Math.abs(loss))}</p>
        </div>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
          aria-label="Filter by reason"
        >
          <option value="">All reasons</option>
          <option value="DAMAGE">Damaged</option>
          <option value="SHRINKAGE">Shrinkage</option>
          <option value="COUNT_CORRECTION">Count correction</option>
          <option value="FOUND">Found</option>
          <option value="OPENING">Opening stock</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <Card>
        <DataTable
          title="Stock_Adjustments"
          serverMode
          data={list.items}
          totalCount={list.total}
          onQueryChange={list.setQuery}
          loading={list.loading}
          dateKey="createdAt"
          enableSelection={false}
          defaultPageSize={25}
          columns={[
            { key: "createdAt", label: "Date", sortable: false, render: (a) => formatDateTime(a.createdAt) },
            { key: "product", label: "Product", sortable: false, exportValue: (a) => a.product?.name, render: (a) => <span className="font-semibold">{a.product?.name}</span> },
            {
              key: "quantity",
              label: "Quantity",
              sortable: false,
              render: (a) => (
                <span className={`font-bold ${a.quantity < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {a.quantity > 0 ? "+" : ""}
                  {a.quantity} {a.product?.unit?.symbol}
                </span>
              ),
            },
            { key: "reason", label: "Reason", sortable: false, render: (a) => <Badge variant={REASON_VARIANT[a.reason]}>{a.reasonLabel || a.reason}</Badge> },
            { key: "valueImpact", label: "Cost Impact", sortable: false, render: (a) => <span className={a.valueImpact < 0 ? "text-rose-600" : ""}>{formatCurrency(a.valueImpact)}</span> },
            { key: "notes", label: "Notes", sortable: false, render: (a) => <span className="text-zinc-500">{a.notes || "—"}</span> },
            { key: "user", label: "By", sortable: false, exportValue: (a) => a.user?.name, render: (a) => a.user?.name || "—" },
          ]}
        />
      </Card>

      <Modal isOpen={picker} onClose={() => setPicker(false)} title="Choose product to adjust">
        <div className="space-y-3">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
            autoFocus
          >
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.stockQuantity} {p.unit?.symbol}
              </option>
            ))}
          </select>
          <Button
            className="w-full"
            disabled={!productId}
            onClick={() => {
              setAdjustProduct(products.find((p) => String(p.id) === String(productId)));
              setPicker(false);
            }}
          >
            Continue
          </Button>
        </div>
      </Modal>

      <StockAdjustModal
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        product={adjustProduct}
        onDone={() => {
          list.reload();
          api.get("/products", { params: { view: "pos" } }).then((r) => setProducts(r.data || [])).catch(() => {});
        }}
      />
    </div>
  );
}
