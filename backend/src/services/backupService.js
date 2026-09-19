import * as XLSX from "xlsx";
import JSZip from "jszip";
import { prisma } from "../config/prisma.js";

/**
 * Fetch and format all database tables
 */
export const getAllTablesData = async () => {
  const [
    products,
    sales,
    saleItems,
    customers,
    stockEntries,
    stockBatches,
    expenses,
    suppliers,
    categories,
    brands,
    units,
  ] = await Promise.all([
    prisma.product.findMany({
      include: { category: true, brand: true, unit: true, supplier: true },
      orderBy: { id: "asc" },
    }),
    prisma.sale.findMany({
      include: { customer: true, user: true },
      orderBy: { id: "desc" },
    }),
    prisma.saleItem.findMany({
      include: { product: { include: { unit: true } }, sale: true },
      orderBy: { id: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { id: "asc" } }),
    prisma.stockEntry.findMany({
      include: { product: true, supplier: true },
      orderBy: { id: "desc" },
    }),
    prisma.stockBatch.findMany({
      include: { product: true },
      orderBy: { id: "desc" },
    }),
    prisma.expense.findMany({
      include: { category: true, user: true },
      orderBy: { date: "desc" },
    }),
    prisma.supplier.findMany({ orderBy: { id: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.brand.findMany({ orderBy: { id: "asc" } }),
    prisma.unit.findMany({ orderBy: { id: "asc" } }),
  ]);

  // Format Tables Data into clean rows with readable headers
  const tables = {
    Products: products.map((p) => ({
      ID: p.id,
      "Product Name": p.name,
      SKU: p.sku || "",
      Barcode: p.barcode || "",
      Category: p.category?.name || "Uncategorized",
      Brand: p.brand?.name || "",
      Unit: `${p.unit?.name || ""} (${p.unit?.symbol || ""})`,
      "Cost Price (PKR)": p.costPrice,
      "Sale Price (PKR)": p.salePrice,
      "Stock Quantity": p.stockQuantity,
      "Low Stock Threshold": p.lowStockAlert,
      "Is Active": p.isActive ? "Yes" : "No",
      "Created At": p.createdAt ? new Date(p.createdAt).toLocaleString("en-PK") : "",
    })),

    Sales: sales.map((s) => ({
      ID: s.id,
      "Sale Number": s.saleNumber,
      "Sale Date": s.createdAt ? new Date(s.createdAt).toLocaleString("en-PK") : "",
      Customer: s.customer?.name || "Walk-in",
      "Customer Phone": s.customer?.phone || "",
      Cashier: s.user?.name || "System",
      "Subtotal (PKR)": s.subtotal,
      "Discount Type": s.discountType || "None",
      "Discount Value": s.discountValue,
      "Discount Amount (PKR)": s.discountAmount,
      "Total Net (PKR)": s.totalAmount,
      "Payment Method": s.paymentMethod,
      "Amount Paid (PKR)": s.amountPaid,
      "Change (PKR)": s.changeAmount,
      Status: s.status,
      Notes: s.notes || "",
    })),

    Sale_Items: saleItems.map((si) => ({
      "Item ID": si.id,
      "Sale Number": si.sale?.saleNumber || "",
      "Product Name": si.product?.name || "",
      "Batch ID": si.batchId ? `#${si.batchId}` : "Standard",
      Quantity: si.quantity,
      Unit: si.product?.unit?.symbol || "pcs",
      "Cost Rate (PKR)": si.costPrice,
      "Sold Rate (PKR)": si.unitPrice,
      "Line Subtotal (PKR)": si.subtotal,
      "Sale Date": si.createdAt ? new Date(si.createdAt).toLocaleString("en-PK") : "",
    })),

    Customers: customers.map((c) => ({
      ID: c.id,
      "Customer Name": c.name,
      Phone: c.phone || "",
      CNIC: c.cnic || "",
      Address: c.address || "",
      "Outstanding Khata Balance (PKR)": c.outstandingBalance,
      Notes: c.notes || "",
      "Registered On": c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-PK") : "",
    })),

    Stock_Purchases: stockEntries.map((se) => ({
      ID: se.id,
      "Product Name": se.product?.name || "",
      Supplier: se.supplier?.name || "Direct / Internal",
      Quantity: se.quantity,
      "Cost Per Unit (PKR)": se.costPerUnit,
      "Total Cost (PKR)": se.totalCost,
      "Previous Cost (PKR)": se.previousCostPerUnit ?? "",
      "Price Diff (PKR)": se.priceDiff ?? "",
      "Purchased At": se.purchasedAt ? new Date(se.purchasedAt).toLocaleString("en-PK") : "",
      Notes: se.notes || "",
    })),

    Stock_Batches: stockBatches.map((sb) => ({
      "Batch ID": sb.id,
      "Product Name": sb.product?.name || "",
      "Stock Entry ID": sb.stockEntryId ? `#${sb.stockEntryId}` : "Initial Lot",
      "Initial Qty": sb.initialQuantity,
      "Remaining Qty": sb.remainingQuantity,
      "Cost Price (PKR)": sb.costPrice,
      "Selling Price (PKR)": sb.sellingPrice,
      "Created Date": sb.createdAt ? new Date(sb.createdAt).toLocaleString("en-PK") : "",
    })),

    Expenses: expenses.map((e) => ({
      ID: e.id,
      Title: e.title,
      Category: e.category?.name || "General",
      "Amount (PKR)": e.amount,
      Date: e.date ? new Date(e.date).toLocaleDateString("en-PK") : "",
      "Recorded By": e.user?.name || "Admin",
      Notes: e.notes || "",
    })),

    Suppliers: suppliers.map((sup) => ({
      ID: sup.id,
      "Supplier Name": sup.name,
      Phone: sup.phone || "",
      City: sup.city || "",
      Address: sup.address || "",
      Notes: sup.notes || "",
    })),

    Categories: categories.map((cat) => ({
      ID: cat.id,
      "Category Name": cat.name,
      "Created At": cat.createdAt ? new Date(cat.createdAt).toLocaleDateString("en-PK") : "",
    })),

    Brands: brands.map((b) => ({
      ID: b.id,
      "Brand Name": b.name,
      Country: b.country || "",
      Notes: b.notes || "",
    })),

    Units: units.map((u) => ({
      ID: u.id,
      "Unit Name": u.name,
      Symbol: u.symbol || "",
      "Allow Decimals": u.allowDecimal ? "Yes" : "No",
    })),
  };

  return tables;
};

/**
 * Generate Multi-sheet Excel (.xlsx) file buffer
 */
export const exportAsExcel = async () => {
  const tables = await getAllTablesData();
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, rows] of Object.entries(tables)) {
    const safeRows = rows.length > 0 ? rows : [{ "No Records": "No data found for this table" }];
    const worksheet = XLSX.utils.json_to_sheet(safeRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31)); // Excel max sheet name 31 chars
  }

  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().split("T")[0];

  return {
    buffer: excelBuffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: `GM_Fabrics_All_Tables_${dateStr}.xlsx`,
  };
};

/**
 * Generate CSV Archive (.zip) containing individual CSV files for each table
 */
export const exportAsCsvZip = async () => {
  const tables = await getAllTablesData();
  const dateStr = new Date().toISOString().split("T")[0];
  const zip = new JSZip();

  for (const [tableName, rows] of Object.entries(tables)) {
    const safeRows = rows.length > 0 ? rows : [{ "No Records": "No data found for this table" }];
    const worksheet = XLSX.utils.json_to_sheet(safeRows);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    zip.file(`${tableName}.csv`, csvContent);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return {
    buffer: zipBuffer,
    contentType: "application/zip",
    filename: `GM_Fabrics_All_Tables_CSV_${dateStr}.zip`,
  };
};

/**
 * Safely Reset / Wipe Entire System Database (Preserves Admin and Core Units)
 */
export const resetDatabase = async () => {
  return prisma.$transaction(
    async (tx) => {
      // 1. Delete POS Transactions and Returns (Leaf & Child Records first)
      await tx.receipt.deleteMany({});
      await tx.returnItem.deleteMany({});
      await tx.return.deleteMany({});
      await tx.saleItem.deleteMany({});
      await tx.sale.deleteMany({});

      // 2. Delete Stock Lots and Purchases
      await tx.stockBatch.deleteMany({});
      await tx.stockEntry.deleteMany({});

      // 3. Delete Product Catalog
      await tx.product.deleteMany({});

      // 4. Delete Expenses, Notes, Notifications
      await tx.expense.deleteMany({});
      await tx.expenseCategory.deleteMany({});
      await tx.note.deleteMany({});
      await tx.notification.deleteMany({});

      // 5. Delete Master Data (Customers, Suppliers, Brands, Categories)
      await tx.customer.deleteMany({});
      await tx.supplier.deleteMany({});
      await tx.brand.deleteMany({});
      await tx.category.deleteMany({});

      // 6. Delete Cashier Users (Preserve Administrator Account)
      await tx.user.deleteMany({
        where: { role: { not: "ADMIN" } },
      });

      return {
        success: true,
        message: "Database wiped and reset successfully. Admin user and units preserved.",
        timestamp: new Date().toISOString(),
      };
    },
    {
      maxWait: 20000, // Wait up to 20s to acquire connection from pooler
      timeout: 60000, // Allow up to 60s for cloud PostgreSQL operations
    }
  );
};
