"use client";

import React, { useState } from "react";
import { PageHeader } from "../../../components/common/pageHeader.jsx";
import { Card } from "../../../components/common/card.jsx";
import { Badge } from "../../../components/common/badge.jsx";
import { DataTable } from "../../../components/common/dataTable.jsx";
import { formatDateTime } from "../../../utils/formatDate.js";
import { useServerList } from "../../../hooks/useServerList.js";

const actionVariant = (action) => {
  if (/DELETE|VOID|RESET|DEACTIVATED/.test(action)) return "danger";
  if (/ADJUST|OVERRIDE|BACKDATED|UPDATED/.test(action)) return "amber";
  if (/CREATED|PURCHASE|PAYMENT|OPENED|CLOSED/.test(action)) return "emerald";
  return "default";
};

const renderDetails = (details) => {
  if (!details) return "—";
  return Object.entries(details)
    .map(([k, v]) => {
      if (v && typeof v === "object" && "from" in v && "to" in v) return `${k}: ${v.from} → ${v.to}`;
      if (v && typeof v === "object") return `${k}: ${JSON.stringify(v)}`;
      return `${k}: ${v}`;
    })
    .join(" • ");
};

export default function AuditLogPage() {
  const [action, setAction] = useState("");
  const list = useServerList("/audit-logs", { params: { action }, pageSize: 50 });
  const actions = list.extra?.actions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Who changed prices, stock, khata balances, voided bills, deleted records or exported data — and when."
      />
      <select
        value={action}
        onChange={(e) => setAction(e.target.value)}
        className="text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
        aria-label="Filter by action"
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <Card>
        <DataTable
          title="Audit_Log"
          serverMode
          data={list.items}
          totalCount={list.total}
          onQueryChange={list.setQuery}
          loading={list.loading}
          dateKey="createdAt"
          enableSelection={false}
          defaultPageSize={50}
          columns={[
            { key: "createdAt", label: "When", sortable: false, render: (l) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span> },
            { key: "user", label: "User", sortable: false, exportValue: (l) => l.user?.name, render: (l) => l.user?.name || "System" },
            { key: "action", label: "Action", sortable: false, render: (l) => <Badge variant={actionVariant(l.action)}>{l.action.replace(/_/g, " ")}</Badge> },
            { key: "entity", label: "Record", sortable: false, render: (l) => `${l.entity}${l.entityId ? ` #${l.entityId}` : ""}` },
            {
              key: "details",
              label: "Details",
              sortable: false,
              exportValue: (l) => renderDetails(l.details),
              render: (l) => <span className="text-[11px] text-zinc-500 break-words max-w-md block">{renderDetails(l.details)}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
