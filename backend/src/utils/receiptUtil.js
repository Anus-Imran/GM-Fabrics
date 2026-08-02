/**
 * Thermal Receipt HTML Generator (80mm width)
 * Official GM Fabrics POS Receipt Template
 */
export const generateReceiptHtml = (sale) => {
  const dateStr = new Date(sale.createdAt || Date.now()).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const customerName = sale.customer ? sale.customer.name : "Walk-in Customer";
  const customerPhone = sale.customer?.phone ? ` (${sale.customer.phone})` : "";
  const cashierName = sale.user ? sale.user.name : "Cashier";

  const totalRefunded = (sale.returns || []).reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const netAmount = Math.max(0, (sale.totalAmount || 0) - totalRefunded);
  const isRefunded = sale.status === "REFUNDED" || totalRefunded >= sale.totalAmount;
  const isPartiallyRefunded = sale.status === "PARTIALLY_REFUNDED" || (totalRefunded > 0 && !isRefunded);

  let totalItemSavings = 0;

  const itemsHtml = (sale.saleItems || [])
    .map((item) => {
      const origPrice = item.product?.salePrice || item.unitPrice;
      const hasItemDiscount = origPrice > item.unitPrice;
      const itemDiscPerUnit = hasItemDiscount ? origPrice - item.unitPrice : 0;
      if (hasItemDiscount) {
        totalItemSavings += itemDiscPerUnit * item.quantity;
      }

      return `
    <tr>
      <td style="text-align: left; padding: 3px 0;">
        <strong>${item.product?.name || "Fabric Item"}</strong>
        ${
          hasItemDiscount
            ? `<br><span style="font-size: 9px; color: #444; font-style: italic;">Orig: PKR ${origPrice.toLocaleString()} (Disc: -PKR ${itemDiscPerUnit.toLocaleString()}/unit)</span>`
            : ""
        }
      </td>
      <td style="text-align: center; padding: 3px 0; vertical-align: top; font-weight: bold;">${item.quantity} ${item.product?.unit?.symbol || "pcs"}</td>
      <td style="text-align: right; padding: 3px 0; vertical-align: top;">${item.unitPrice.toLocaleString()}</td>
      <td style="text-align: right; padding: 3px 0; vertical-align: top; font-weight: bold;">${item.subtotal.toLocaleString()}</td>
    </tr>
  `;
    })
    .join("");

  const combinedTotalSavings = totalItemSavings + (sale.discountAmount || 0);

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
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">GM FABRICS</div>
    <div class="subtitle" style="margin-top: 2px;">Shop#2150, Near Fatima Pharmacy,<br>Malikpur Road, Nishatabad, Faisalabad</div>
    <div class="subtitle" style="font-weight: bold; font-size: 11px; margin-top: 3px;">Tel: 03079728937, 0303 7779080</div>
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

  <div class="row"><span>Subtotal:</span><span>PKR ${sale.subtotal.toLocaleString()}</span></div>
  ${
    sale.discountAmount > 0
      ? `<div class="row"><span>Bill Discount:</span><span>- PKR ${sale.discountAmount.toLocaleString()}</span></div>`
      : ""
  }
  ${
    combinedTotalSavings > 0
      ? `<div class="row savings-row"><span>YOU SAVED TOTAL:</span><span>PKR ${combinedTotalSavings.toLocaleString()}</span></div>`
      : ""
  }
  
  <div class="double-divider"></div>
  
  <div class="row ${totalRefunded > 0 ? '' : 'total-row'}"><span>Original Total:</span><span>PKR ${sale.totalAmount.toLocaleString()}</span></div>
  ${
    totalRefunded > 0
      ? `<div class="row" style="color: #d97706; font-weight: bold;"><span>Total Refunded:</span><span>- PKR ${totalRefunded.toLocaleString()}</span></div>
         <div class="double-divider"></div>
         <div class="row total-row"><span>NET TOTAL:</span><span>PKR ${netAmount.toLocaleString()}</span></div>`
      : ""
  }
  
  <div class="divider"></div>

  <div class="row"><span>Payment Method:</span><span class="bold">${sale.paymentMethod}</span></div>
  <div class="row"><span>Amount Tendered:</span><span>PKR ${(sale.amountPaid || sale.totalAmount).toLocaleString()}</span></div>
  ${
    sale.paymentMethod === "CASH"
      ? `<div class="row"><span>Change Returned:</span><span>PKR ${(sale.changeAmount || 0).toLocaleString()}</span></div>`
      : ""
  }

  <div class="double-divider"></div>

  <div class="text-center subtitle" style="line-height: 1.4; margin-top: 4px;">
    <strong>Thank you for shopping at GM Fabrics!</strong><br>
    <span style="font-weight: bold; font-size: 11px;">Return in 7 days acceptable</span><br>
    <span style="font-size: 9px; color: #444;">(With original sales receipt & un-cut fabric)</span>
  </div>
</body>
</html>
  `.trim();
};
