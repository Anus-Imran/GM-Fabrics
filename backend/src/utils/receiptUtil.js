/**
 * Thermal Receipt HTML Generator (80mm width)
 */
export const generateReceiptHtml = (sale) => {
  const dateStr = new Date(sale.createdAt || Date.now()).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const customerName = sale.customer ? sale.customer.name : "Walk-in Customer";
  const cashierName = sale.user ? sale.user.name : "Cashier";

  const totalRefunded = (sale.returns || []).reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const netAmount = Math.max(0, (sale.totalAmount || 0) - totalRefunded);
  const isRefunded = sale.status === "REFUNDED" || totalRefunded >= sale.totalAmount;
  const isPartiallyRefunded = sale.status === "PARTIALLY_REFUNDED" || (totalRefunded > 0 && !isRefunded);

  const itemsHtml = (sale.saleItems || [])
    .map(
      (item) => `
    <tr>
      <td style="text-align: left; padding: 3px 0;">${item.product?.name || "Product"}</td>
      <td style="text-align: center; padding: 3px 0;">${item.quantity} ${item.product?.unit?.symbol || ""}</td>
      <td style="text-align: right; padding: 3px 0;">${item.unitPrice.toLocaleString()}</td>
      <td style="text-align: right; padding: 3px 0;">${item.subtotal.toLocaleString()}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${sale.saleNumber}</title>
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
    .text-left { text-left: left; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .double-divider { border-top: 2px double #000; margin: 8px 0; }
    .title { font-size: 16px; font-weight: bold; }
    .subtitle { font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px; }
    th { border-bottom: 1px solid #000; padding: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .bold { font-weight: bold; }
    .total-row { font-size: 14px; font-weight: bold; }
    .status-badge { text-align: center; font-weight: bold; margin: 4px 0; font-size: 11px; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">GM FABRICS</div>
    <div class="subtitle">Main Bazar, Lahore</div>
    <div class="subtitle">Tel: +92 300 1234567</div>
  </div>

  ${
    isRefunded
      ? `<div class="status-badge" style="color: #dc2626;">*** REFUNDED BILL ***</div>`
      : isPartiallyRefunded
      ? `<div class="status-badge" style="color: #d97706;">*** PARTIALLY REFUNDED ***</div>`
      : ""
  }

  <div class="double-divider"></div>

  <div class="row"><span>Bill #:</span><span class="bold">${sale.saleNumber}</span></div>
  <div class="row"><span>Date:</span><span>${dateStr}</span></div>
  <div class="row"><span>Cashier:</span><span>${cashierName}</span></div>
  <div class="row"><span>Customer:</span><span>${customerName}</span></div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th class="text-left">Item</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="row"><span>Subtotal:</span><span>PKR ${sale.subtotal.toLocaleString()}</span></div>
  ${
    sale.discountAmount > 0
      ? `<div class="row"><span>Discount:</span><span>- PKR ${sale.discountAmount.toLocaleString()}</span></div>`
      : ""
  }
  
  <div class="double-divider"></div>
  
  <div class="row ${totalRefunded > 0 ? '' : 'total-row'}"><span>Original Total:</span><span>PKR ${sale.totalAmount.toLocaleString()}</span></div>
  ${
    totalRefunded > 0
      ? `<div class="row" style="color: #d97706; font-weight: bold;"><span>Total Returned:</span><span>- PKR ${totalRefunded.toLocaleString()}</span></div>
         <div class="double-divider"></div>
         <div class="row total-row"><span>NET TOTAL:</span><span>PKR ${netAmount.toLocaleString()}</span></div>`
      : ""
  }
  
  <div class="divider"></div>

  <div class="row"><span>Payment (${sale.paymentMethod}):</span><span>PKR ${sale.amountPaid.toLocaleString()}</span></div>
  <div class="row"><span>Change:</span><span>PKR ${sale.changeAmount.toLocaleString()}</span></div>

  <div class="double-divider"></div>

  <div class="text-center subtitle">
    Thank you for shopping at GM Fabrics!<br>
    Returns accepted within 7 days with receipt.
  </div>
</body>
</html>
  `.trim();
};

