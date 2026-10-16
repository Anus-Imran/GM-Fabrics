/**
 * Thermal Receipt HTML Generator (80mm width)
 * Official GM Fabrics POS Receipt Template. All user-entered text is HTML-escaped.
 */
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const SHOP_TZ = process.env.SHOP_TIMEZONE || "Asia/Karachi";

export const generateReceiptHtml = (sale) => {
  const dateStr = new Date(sale.createdAt || Date.now()).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: SHOP_TZ,
  });

  const customerName = escapeHtml(sale.customer ? sale.customer.name : "Walk-in Customer");
  const customerPhone = sale.customer?.phone ? ` (${escapeHtml(sale.customer.phone)})` : "";
  const cashierName = escapeHtml(sale.user ? sale.user.name : "Cashier");

  const totalRefunded = (sale.returns || []).reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const netAmount = Math.max(0, (sale.totalAmount || 0) - totalRefunded);
  const isVoided = sale.status === "VOIDED";
  const isRefunded = !isVoided && (sale.status === "REFUNDED" || (totalRefunded > 0 && totalRefunded >= sale.totalAmount));
  const isPartiallyRefunded = !isVoided && !isRefunded && (sale.status === "PARTIALLY_REFUNDED" || totalRefunded > 0);

  const fmt = (v) => {
    const n = parseFloat(v) || 0;
    const hasDecimals = Math.abs(n % 1) > 0.0001;
    return n.toLocaleString("en-PK", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
  };
  const fmtQty = (v) => {
    const n = parseFloat(v) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  };

  // Lines of the same product at the same rate (different FIFO lots) are printed as one row.
  const grouped = [];
  for (const item of sale.saleItems || []) {
    const key = `${item.productId}_${item.unitPrice}`;
    const existing = grouped.find((g) => g.key === key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.subtotal += item.subtotal;
      existing.listTotal += (item.listPrice || item.unitPrice) * item.quantity;
    } else {
      grouped.push({
        key,
        name: item.product?.name || "Fabric Item",
        unit: item.product?.unit?.symbol || "pcs",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        listTotal: (item.listPrice || item.unitPrice) * item.quantity,
      });
    }
  }

  let totalItemSavings = 0;

  const itemsHtml = grouped
    .map((item) => {
      const listPerUnit = item.quantity > 0 ? item.listTotal / item.quantity : item.unitPrice;
      const discPerUnit = listPerUnit - item.unitPrice;
      const hasItemDiscount = discPerUnit > 0.004;
      if (hasItemDiscount) totalItemSavings += discPerUnit * item.quantity;

      return `
    <tr>
      <td style="text-align: left; padding: 3px 0;">
        <strong>${escapeHtml(item.name)}</strong>
        ${
          hasItemDiscount
            ? `<br><span style="font-size: 9px; color: #444; font-style: italic;">Orig: PKR ${fmt(listPerUnit)} (Disc: -PKR ${fmt(discPerUnit)}/unit)</span>`
            : ""
        }
      </td>
      <td style="text-align: center; padding: 3px 0; vertical-align: top; font-weight: bold;">${fmtQty(item.quantity)} ${escapeHtml(item.unit)}</td>
      <td style="text-align: right; padding: 3px 0; vertical-align: top;">${fmt(item.unitPrice)}</td>
      <td style="text-align: right; padding: 3px 0; vertical-align: top; font-weight: bold;">${fmt(item.subtotal)}</td>
    </tr>
  `;
    })
    .join("");

  const combinedTotalSavings = totalItemSavings + (sale.discountAmount || 0);
  const creditAmount = sale.creditAmount || (sale.paymentMethod === "CREDIT" ? sale.totalAmount - (sale.amountPaid || 0) : 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${escapeHtml(sale.saleNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    body {
      width: 78mm;
      margin: 0 auto;
      padding: 10px 5px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px double #000; margin: 6px 0; }
    .title { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
    .subtitle { font-size: 10px; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px; }
    th { border-bottom: 1px solid #000; padding: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .bold { font-weight: bold; }
    .total-row { font-size: 14px; font-weight: bold; }
    .status-badge { text-align: center; font-weight: bold; margin: 4px 0; font-size: 11px; }
    .savings-row { color: #15803d; font-weight: bold; font-size: 11px; }
    .urdu { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif; direction: rtl; font-size: 12px; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">GM FABRICS</div>
    <div class="subtitle" style="margin-top: 2px;">Shop#2150, Near Fatima Pharmacy,<br>Malikpur Road, Nishatabad, Faisalabad</div>
    <div class="subtitle" style="font-weight: bold; font-size: 11px; margin-top: 3px;">Tel: 03079728937, 0303 7779080</div>
  </div>

  ${
    isVoided
      ? `<div class="status-badge" style="color: #dc2626;">*** VOIDED BILL — NOT VALID ***</div>`
      : isRefunded
      ? `<div class="status-badge" style="color: #dc2626;">*** REFUNDED BILL ***</div>`
      : isPartiallyRefunded
      ? `<div class="status-badge" style="color: #d97706;">*** PARTIALLY REFUNDED ***</div>`
      : ""
  }

  <div class="double-divider"></div>

  <div class="row"><span>Bill #:</span><span class="bold">${escapeHtml(sale.saleNumber)}</span></div>
  <div class="row"><span>Date & Time:</span><span>${dateStr}</span></div>
  <div class="row"><span>Cashier:</span><span>${cashierName}</span></div>
  <div class="row"><span>Customer:</span><span>${customerName}${customerPhone}</span></div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th class="text-left">Fabric Item</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="row"><span>Subtotal:</span><span>PKR ${fmt(sale.subtotal)}</span></div>
  ${
    sale.discountAmount > 0
      ? `<div class="row"><span>Bill Discount:</span><span>- PKR ${fmt(sale.discountAmount)}</span></div>`
      : ""
  }
  ${
    combinedTotalSavings > 0.004
      ? `<div class="row savings-row"><span>YOU SAVED TOTAL:</span><span>PKR ${fmt(combinedTotalSavings)}</span></div>`
      : ""
  }

  <div class="double-divider"></div>

  <div class="row ${totalRefunded > 0 ? "" : "total-row"}"><span>Original Total:</span><span>PKR ${fmt(sale.totalAmount)}</span></div>
  ${
    totalRefunded > 0
      ? `<div class="row" style="color: #d97706; font-weight: bold;"><span>Total Refunded:</span><span>- PKR ${fmt(totalRefunded)}</span></div>
         <div class="double-divider"></div>
         <div class="row total-row"><span>NET TOTAL:</span><span>PKR ${fmt(netAmount)}</span></div>`
      : ""
  }

  <div class="divider"></div>

  <div class="row"><span>Payment Method:</span><span class="bold">${sale.paymentMethod === "CREDIT" ? "KHATA" : escapeHtml(sale.paymentMethod)}</span></div>
  ${
    sale.paymentMethod === "CREDIT"
      ? `<div class="row"><span>Paid Now:</span><span>PKR ${fmt(sale.amountPaid || 0)}</span></div>
         <div class="row bold"><span>Added to Khata:</span><span>PKR ${fmt(creditAmount)}</span></div>`
      : `<div class="row"><span>Amount Tendered:</span><span>PKR ${fmt(sale.amountPaid || sale.totalAmount)}</span></div>`
  }
  ${
    sale.paymentMethod === "CASH"
      ? `<div class="row"><span>Change Returned:</span><span>PKR ${fmt(sale.changeAmount || 0)}</span></div>`
      : ""
  }

  <div class="double-divider"></div>

  <div class="text-center subtitle" style="line-height: 1.4; margin-top: 4px;">
    <strong>Thank you for shopping at GM Fabrics!</strong><br>
    <span class="urdu">جی ایم فیبرکس سے خریداری کا شکریہ</span><br>
    <span style="font-weight: bold; font-size: 11px;">Return & Change in 7 days acceptable</span><br>
    <span class="urdu">سات دن کے اندر واپسی و تبدیلی ممکن ہے</span><br>
    <span style="font-size: 9px; color: #444;">(With original sales receipt & un-cut fabric)</span>
  </div>
</body>
</html>
  `.trim();
};
