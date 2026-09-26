import * as stockEntryService from "../services/stockEntryService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getStockEntries = async (req, res) => {
  try {
    const entries = await stockEntryService.getAllStockEntries(req.query);
    return sendSuccess(res, "Stock entries retrieved successfully", entries);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getStockEntry = async (req, res) => {
  try {
    const entry = await stockEntryService.getStockEntryById(req.params.id);
    return sendSuccess(res, "Stock entry retrieved", entry);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const createStockEntry = async (req, res) => {
  try {
    const { productId, quantity, costPerUnit } = req.body;
    if (!productId || !quantity || costPerUnit === undefined) {
      return sendError(res, "Product ID, quantity, and cost per unit are required", 400);
    }
    const entry = await stockEntryService.createStockEntry(req.body);
    return sendSuccess(res, "Stock entry created & inventory updated", entry, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateStockEntry = async (req, res) => {
  try {
    const entry = await stockEntryService.updateStockEntry(req.params.id, req.body);
    return sendSuccess(res, "Stock purchase entry updated & inventory synchronized", entry);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteStockEntry = async (req, res) => {
  try {
    const result = await stockEntryService.deleteStockEntry(req.params.id);
    return sendSuccess(res, "Stock purchase entry deleted successfully", result);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteManyStockEntries = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, "Array of entry IDs is required", 400);
    }
    const results = await stockEntryService.deleteManyStockEntries(ids);
    return sendSuccess(res, "Selected stock purchase entries deleted successfully", results);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

