import api from "../services/apiService.js";

/**
 * Prints receipt HTML through a hidden iframe (no pop-up window, works with pop-up
 * blockers) and logs the print on the server.
 */
export const printReceiptHtml = (html, saleId) => {
  if (saleId) api.post(`/receipts/${saleId}/print`).catch(() => {});

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      // ignore
    } finally {
      setTimeout(() => iframe.remove(), 1000);
    }
  };
  iframe.onload = doPrint;
  // Some browsers do not fire onload for document.write content.
  setTimeout(doPrint, 600);
};

/** Opens WhatsApp with a short bill summary for the customer. */
export const shareSaleOnWhatsApp = (sale) => {
  const lines = [
    `*GM FABRICS* — Bill ${sale.saleNumber}`,
    new Date(sale.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }),
    "",
    ...(sale.saleItems || []).map(
      (i) => `${i.product?.name || "Item"}: ${i.quantity} ${i.product?.unit?.symbol || ""} × ${i.unitPrice} = ${i.subtotal}`
    ),
    "",
    sale.discountAmount > 0 ? `Discount: -${sale.discountAmount}` : null,
    `*Total: PKR ${Number(sale.totalAmount).toLocaleString("en-PK")}*`,
    sale.paymentMethod === "CREDIT" ? `Added to khata: PKR ${Number(sale.creditAmount || 0).toLocaleString("en-PK")}` : `Paid by ${sale.paymentMethod}`,
    "",
    "Thank you for shopping at GM Fabrics! Returns within 7 days with receipt.",
  ].filter((l) => l !== null);

  let phone = (sale.customer?.phone || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = `92${phone.slice(1)}`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
};
