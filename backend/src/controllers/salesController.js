import * as saleService from "../services/saleService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getSales = async (req, res) => {
  try {
    const sales = await saleService.getAllSales(req.query);
    return sendSuccess(res, "Sales retrieved successfully", sales);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getSale = async (req, res) => {
  try {
    const sale = await saleService.getSaleById(req.params.id);
    return sendSuccess(res, "Sale details retrieved", sale);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const createSale = async (req, res) => {
  try {
    const sale = await saleService.createSale(req.user.id, req.body);
    return sendSuccess(res, "Sale completed successfully", sale, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, "Status is required", 400);
    const sale = await saleService.updateSaleStatus(req.params.id, status);
    return sendSuccess(res, "Sale status updated", sale);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
