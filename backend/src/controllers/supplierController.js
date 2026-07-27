import * as supplierService from "../services/supplierService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await supplierService.getAllSuppliers();
    return sendSuccess(res, "Suppliers retrieved successfully", suppliers);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    return sendSuccess(res, "Supplier details retrieved", supplier);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "Supplier name is required", 400);
    const supplier = await supplierService.createSupplier(req.body);
    return sendSuccess(res, "Supplier created successfully", supplier, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    return sendSuccess(res, "Supplier updated successfully", supplier);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    await supplierService.deleteSupplier(req.params.id);
    return sendSuccess(res, "Supplier deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const getSupplierStockHistory = async (req, res) => {
  try {
    const history = await supplierService.getSupplierStockHistory(req.params.id);
    return sendSuccess(res, "Supplier stock history retrieved", history);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};
