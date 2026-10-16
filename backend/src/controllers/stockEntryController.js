import * as stockEntryService from "../services/stockEntryService.js";
import { sendSuccess } from "../utils/responseUtil.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getStockEntries = asyncHandler(async (req, res) => {
  const entries = await stockEntryService.getAllStockEntries(req.query);
  return sendSuccess(res, "Stock entries retrieved successfully", entries);
});

export const getStockEntry = asyncHandler(async (req, res) => {
  const entry = await stockEntryService.getStockEntryById(req.params.id);
  return sendSuccess(res, "Stock entry retrieved", entry);
});

export const createStockEntry = asyncHandler(async (req, res) => {
  const entry = await stockEntryService.createStockEntry(req.user, req.body);
  return sendSuccess(res, "Stock entry created & inventory updated", entry, 201);
});

export const createBulkStockEntries = asyncHandler(async (req, res) => {
  const entries = await stockEntryService.createBulkStockEntries(req.user, req.body);
  return sendSuccess(res, `Purchase invoice saved (${entries.length} items)`, entries, 201);
});

export const updateStockEntry = asyncHandler(async (req, res) => {
  const entry = await stockEntryService.updateStockEntry(req.user, req.params.id, req.body);
  return sendSuccess(res, "Stock purchase entry updated successfully", entry);
});

export const deleteStockEntry = asyncHandler(async (req, res) => {
  const result = await stockEntryService.deleteStockEntry(req.user, req.params.id);
  return sendSuccess(res, "Stock purchase entry deleted successfully", result);
});

export const deleteManyStockEntries = asyncHandler(async (req, res) => {
  const results = await stockEntryService.deleteManyStockEntries(req.user, req.body.ids);
  return sendSuccess(res, `${results.length} purchase entries deleted successfully`, results);
});
