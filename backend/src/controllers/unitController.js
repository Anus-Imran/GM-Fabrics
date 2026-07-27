import * as unitService from "../services/unitService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getUnits = async (req, res) => {
  try {
    const units = await unitService.getAllUnits();
    return sendSuccess(res, "Units retrieved successfully", units);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createUnit = async (req, res) => {
  try {
    const { name, symbol } = req.body;
    if (!name) return sendError(res, "Unit name is required", 400);
    const unit = await unitService.createUnit({ name, symbol });
    return sendSuccess(res, "Unit created successfully", unit, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateUnit = async (req, res) => {
  try {
    const unit = await unitService.updateUnit(req.params.id, req.body);
    return sendSuccess(res, "Unit updated successfully", unit);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteUnit = async (req, res) => {
  try {
    await unitService.deleteUnit(req.params.id);
    return sendSuccess(res, "Unit deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
