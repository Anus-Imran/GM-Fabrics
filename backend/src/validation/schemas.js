import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Primitive helpers                                                   */
/* ------------------------------------------------------------------ */

const emptyToUndefined = (v) => (v === "" || v === null ? undefined : v);
const emptyToNull = (v) => (v === "" || v === undefined ? null : v);

export const id = z.coerce.number({ invalid_type_error: "must be a number" }).int().positive("must be a valid id");
export const optionalId = z.preprocess(emptyToNull, id.nullable());

export const idParam = z.object({ id });

const num = (label) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).finite(`${label} must be a valid number`);

export const money = (label = "Amount") => num(label).min(0, `${label} cannot be negative`).max(1e10, `${label} is too large`);
export const positiveMoney = (label = "Amount") => num(label).gt(0, `${label} must be greater than zero`).max(1e10, `${label} is too large`);
export const quantity = (label = "Quantity") => num(label).gt(0, `${label} must be greater than zero`).max(1e8, `${label} is too large`);
export const signedQuantity = (label = "Quantity") =>
  num(label).refine((v) => v !== 0, `${label} cannot be zero`).refine((v) => Math.abs(v) <= 1e8, `${label} is too large`);

export const text = (max = 191, label = "Field") => z.string().trim().max(max, `${label} must be at most ${max} characters`);
export const requiredText = (max = 191, label = "Field") => text(max, label).min(1, `${label} is required`);
export const optionalText = (max = 500, label = "Field") =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null), text(max, label).nullable());

// JSON booleans, also accepting "true"/"false" strings from query params / form data.
export const bool = z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean());

export const optionalDate = z.preprocess(emptyToUndefined, z.string().max(40).optional());

// Pakistani phone: mobile (03XX XXXXXXX / +92 3XX XXXXXXX) or landline (0XX XXXXXXX). Stored without spaces/dashes.
export const normalizePhone = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).replace(/[\s\-()]/g, "");
  if (raw === "") return null;
  let digits = raw.replace(/^\+/, "");
  if (digits.startsWith("0092")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("92") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return digits;
};

export const phone = z.preprocess(
  normalizePhone,
  z
    .string()
    .regex(/^0\d{9,10}$/, "Phone must be a valid Pakistani number, e.g. 03001234567")
    .nullable()
);

export const cnic = z.preprocess(
  (v) => {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const digits = String(v).replace(/\D/g, "");
    return digits.length === 13 ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}` : String(v).trim();
  },
  z
    .string()
    .regex(/^\d{5}-\d{7}-\d$/, "CNIC must be 13 digits, e.g. 35202-1234567-1")
    .nullable()
);

export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(191);
export const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Password must contain letters and numbers");

export const paymentMethod = z.enum(["CASH", "CARD", "CREDIT"]);

/* ------------------------------------------------------------------ */
/* Pagination / list filters                                           */
/* ------------------------------------------------------------------ */

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(25),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    from: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
    to: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
    sortBy: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
    sortDir: z.preprocess(emptyToUndefined, z.enum(["asc", "desc"]).optional()),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/* Auth & users                                                        */
/* ------------------------------------------------------------------ */

export const loginBody = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

export const createUserBody = z.object({
  name: requiredText(100, "Name"),
  email,
  password,
  role: z.enum(["ADMIN", "CASHIER"]).default("CASHIER"),
});

export const updateUserBody = z.object({
  name: requiredText(100, "Name").optional(),
  email: email.optional(),
  password: z.preprocess(emptyToUndefined, password.optional()),
  role: z.enum(["ADMIN", "CASHIER"]).optional(),
  isActive: z.boolean().optional(),
});

/* ------------------------------------------------------------------ */
/* Master data                                                         */
/* ------------------------------------------------------------------ */

export const nameBody = z.object({ name: requiredText(100, "Name") });

export const brandBody = z.object({
  name: requiredText(100, "Brand name"),
  country: optionalText(100, "Country"),
  notes: optionalText(500, "Notes"),
});

export const unitBody = z.object({
  name: requiredText(50, "Unit name"),
  symbol: optionalText(10, "Symbol"),
  allowDecimal: bool.optional(),
});

export const supplierBody = z.object({
  name: requiredText(150, "Supplier name"),
  phone: phone.optional(),
  address: optionalText(300, "Address"),
  city: optionalText(100, "City"),
  notes: optionalText(1000, "Notes"),
});

export const supplierPaymentBody = z.object({
  amount: positiveMoney("Payment amount"),
  method: z.enum(["CASH", "BANK", "CHEQUE", "OTHER"]).default("CASH"),
  reference: optionalText(100, "Reference"),
  fromDrawer: bool.default(false),
  notes: optionalText(500, "Notes"),
  paidAt: optionalDate,
});

export const customerBody = z.object({
  name: requiredText(150, "Customer name"),
  phone: phone.optional(),
  cnic: cnic.optional(),
  address: optionalText(300, "Address"),
  notes: optionalText(1000, "Notes"),
});

export const settleBody = z.object({
  amount: positiveMoney("Payment amount"),
  method: z.enum(["CASH", "CARD"]).default("CASH"),
  notes: optionalText(500, "Notes"),
});

export const khataAdjustBody = z.object({
  amount: num("Amount").refine((v) => v !== 0, "Amount cannot be zero"),
  notes: requiredText(500, "Reason"),
});

/* ------------------------------------------------------------------ */
/* Products & stock                                                    */
/* ------------------------------------------------------------------ */

const productFields = {
  name: requiredText(191, "Product name"),
  sku: optionalText(64, "SKU"),
  barcode: optionalText(64, "Barcode"),
  description: optionalText(2000, "Description"),
  categoryId: id,
  brandId: optionalId.optional(),
  unitId: id,
  supplierId: optionalId.optional(),
  costPrice: money("Cost price").default(0),
  salePrice: money("Sale price"),
  stockQuantity: money("Stock quantity").default(0),
  lowStockAlert: money("Low stock alert").default(10),
  createdAt: optionalDate,
  entryDate: optionalDate,
  adjustmentReason: z.enum(["DAMAGE", "SHRINKAGE", "COUNT_CORRECTION", "FOUND", "OPENING", "OTHER"]).optional(),
  adjustmentNotes: optionalText(500, "Adjustment notes"),
};

export const createProductBody = z.object(productFields);
export const updateProductBody = z.object(productFields).partial();

export const productListQuery = z
  .object({
    categoryId: optionalId.optional(),
    brandId: optionalId.optional(),
    unitId: optionalId.optional(),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    lowStock: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
    view: z.preprocess(emptyToUndefined, z.enum(["pos", "full"]).optional()),
  })
  .passthrough();

const stockEntryFields = {
  productId: id,
  supplierId: optionalId.optional(),
  invoiceNumber: optionalText(64, "Invoice number"),
  quantity: quantity("Quantity"),
  costPerUnit: money("Cost per unit"),
  newSalePrice: z.preprocess(emptyToUndefined, money("New sale price").optional()),
  notes: optionalText(1000, "Notes"),
  purchasedAt: optionalDate,
};

export const createStockEntryBody = z.object(stockEntryFields);
export const updateStockEntryBody = z.object(stockEntryFields).partial();

export const bulkStockEntryBody = z.object({
  supplierId: optionalId.optional(),
  invoiceNumber: optionalText(64, "Invoice number"),
  purchasedAt: optionalDate,
  notes: optionalText(1000, "Notes"),
  amountPaid: z.preprocess(emptyToUndefined, money("Amount paid").optional()),
  paymentMethod: z.enum(["CASH", "BANK", "CHEQUE", "OTHER"]).default("CASH"),
  fromDrawer: bool.default(false),
  items: z
    .array(
      z.object({
        productId: id,
        quantity: quantity("Quantity"),
        costPerUnit: money("Cost per unit"),
        newSalePrice: z.preprocess(emptyToUndefined, money("New sale price").optional()),
      })
    )
    .min(1, "Add at least one product")
    .max(200, "Too many lines in one invoice"),
});

export const deleteManyBody = z.object({
  ids: z.array(id).min(1, "Select at least one record").max(500),
});

export const stockAdjustmentBody = z.object({
  productId: id,
  quantity: signedQuantity("Adjustment quantity"),
  reason: z.enum(["DAMAGE", "SHRINKAGE", "COUNT_CORRECTION", "FOUND", "OPENING", "OTHER"]),
  costPrice: z.preprocess(emptyToUndefined, money("Cost price").optional()),
  notes: optionalText(500, "Notes"),
});

/* ------------------------------------------------------------------ */
/* Sales, returns, receipts                                            */
/* ------------------------------------------------------------------ */

export const createSaleBody = z
  .object({
    customerId: optionalId.optional(),
    customerName: optionalText(150, "Customer name"),
    customerPhone: phone.optional(),
    customerCity: optionalText(100, "City"),
    customerAddress: optionalText(300, "Address"),
    newCustomer: z
      .object({
        name: optionalText(150, "Customer name"),
        phone: phone.optional(),
        city: optionalText(100, "City"),
        address: optionalText(300, "Address"),
      })
      .optional()
      .nullable(),
    items: z
      .array(
        z.object({
          productId: id,
          quantity: quantity("Quantity"),
          // When set, the whole line is sold at this net rate (cashier override).
          unitPrice: z.preprocess(emptyToUndefined, money("Unit price").optional()),
          // Otherwise each FIFO lot is sold at its own price minus this per-unit discount.
          discountPerUnit: z.preprocess(emptyToUndefined, money("Item discount").optional()),
          batchId: optionalId.optional(),
        })
      )
      .min(1, "Sale must contain at least one item")
      .max(300, "Too many items in one bill"),
    discountType: z.preprocess(emptyToNull, z.enum(["PERCENTAGE", "FLAT"]).nullable()).optional(),
    discountValue: z.preprocess(emptyToUndefined, money("Discount").optional()),
    paymentMethod: paymentMethod.default("CASH"),
    amountPaid: z.preprocess(emptyToUndefined, money("Amount paid").optional()),
    notes: optionalText(500, "Notes"),
    createdAt: optionalDate,
    saleDate: optionalDate,
  })
  .refine((d) => !(d.discountType === "PERCENTAGE" && (d.discountValue ?? 0) > 100), {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  });

export const voidSaleBody = z.object({
  reason: requiredText(300, "Void reason"),
});

export const salesListQuery = listQuery.extend({
  status: z.preprocess(emptyToUndefined, z.enum(["PENDING", "COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED", "VOIDED"]).optional()),
  paymentMethod: z.preprocess(emptyToUndefined, paymentMethod.optional()),
  customerId: optionalId.optional(),
  userId: optionalId.optional(),
});

export const createReturnBody = z.object({
  saleId: id,
  reason: optionalText(500, "Reason"),
  refundMethod: z.preprocess(emptyToUndefined, paymentMethod.optional()),
  overrideWindow: bool.optional(),
  items: z
    .array(
      z.object({
        saleItemId: id,
        quantity: quantity("Return quantity"),
        condition: z.enum(["RESTOCK", "DAMAGED_WASTE"]).default("RESTOCK"),
      })
    )
    .min(1, "Return must include at least one item")
    .max(300),
});

/* ------------------------------------------------------------------ */
/* Expenses, cash sessions, reports, backup                            */
/* ------------------------------------------------------------------ */

export const expenseBody = z.object({
  title: requiredText(191, "Title"),
  categoryId: id,
  amount: positiveMoney("Expense amount"),
  date: optionalDate,
  fromDrawer: bool.optional(),
  notes: optionalText(1000, "Notes"),
});

export const openSessionBody = z.object({
  openingCash: money("Opening cash").default(0),
  notes: optionalText(500, "Notes"),
});

export const closeSessionBody = z.object({
  countedCash: money("Counted cash"),
  notes: optionalText(500, "Notes"),
});

export const dashboardQuery = z.object({
  period: z
    .enum(["today", "7days", "this_month", "last_month", "this_year", "all_time", "custom"])
    .default("7days"),
  startDate: optionalDate,
  endDate: optionalDate,
});

export const resetDatabaseBody = z.object({
  password: z.string().min(1, "Enter your admin password to confirm"),
  confirmText: z.literal("RESET", { errorMap: () => ({ message: 'Type "RESET" to confirm' }) }),
});

export const noteBody = z.object({
  title: requiredText(191, "Title"),
  content: optionalText(10000, "Content"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  color: z.preprocess(emptyToUndefined, z.enum(["yellow", "blue", "emerald", "purple", "rose"]).optional()),
  dueDate: z.preprocess(emptyToNull, z.string().max(40).nullable()).optional(),
  isCompleted: bool.optional(),
});
