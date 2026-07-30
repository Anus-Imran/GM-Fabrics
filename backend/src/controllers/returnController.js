import * as returnService from "../services/returnService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const createReturn = async (req, res) => {
  try {
    const { saleId, items } = req.body;
    if (!saleId || !items) {
      return sendError(res, "Sale ID and return items are required", 400);
    }
    const returnRecord = await returnService.createReturn(req.body);
    return sendSuccess(res, "Return processed and stock restocked", returnRecord, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const getReturn = async (req, res) => {
  try {
    const returnRecord = await returnService.getReturnById(req.params.id);
    return sendSuccess(res, "Return details retrieved", returnRecord);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const getSaleReturns = async (req, res) => {
  try {
    const returns = await returnService.getReturnsBySaleId(req.params.saleId);
    return sendSuccess(res, "Sale returns retrieved", returns);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getAllReturns = async (req, res) => {
  try {
    const returns = await returnService.getAllReturns();
    return sendSuccess(res, "All returns retrieved", returns);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteReturn = async (req, res) => {
  try {
    const result = await returnService.deleteReturn(req.params.id);
    return sendSuccess(res, "Return deleted and stock adjusted successfully", result);
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 400;
    return sendError(res, error.message, status);
  }
};

