import * as supplierService from "../services/supplierService.js";
import { sendSuccess } from "../utils/responseUtil.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await supplierService.getAllSuppliers();
  return sendSuccess(res, "Suppliers retrieved successfully", suppliers);
});

export const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplierById(req.params.id);
  return sendSuccess(res, "Supplier details retrieved", supplier);
});

export const getSupplierStockHistory = asyncHandler(async (req, res) => {
  const history = await supplierService.getSupplierStockHistory(req.params.id);
  return sendSuccess(res, "Supplier stock history retrieved", history);
});

export const getSupplierLedger = asyncHandler(async (req, res) => {
  const ledger = await supplierService.getSupplierLedger(req.params.id);
  return sendSuccess(res, "Supplier statement retrieved", ledger);
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.user, req.body);
  return sendSuccess(res, "Supplier created successfully", supplier, 201);
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(req.user, req.params.id, req.body);
  return sendSuccess(res, "Supplier updated successfully", supplier);
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  await supplierService.deleteSupplier(req.user, req.params.id);
  return sendSuccess(res, "Supplier deleted successfully");
});

export const recordPayment = asyncHandler(async (req, res) => {
  const payment = await supplierService.recordSupplierPayment(req.user, req.params.id, req.body);
  return sendSuccess(res, "Supplier payment recorded", payment, 201);
});

export const deletePayment = asyncHandler(async (req, res) => {
  const result = await supplierService.deleteSupplierPayment(req.user, req.params.id, req.params.paymentId);
  return sendSuccess(res, "Supplier payment deleted", result);
});
