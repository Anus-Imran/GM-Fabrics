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
