import * as saleService from "../services/saleService.js";
import { sendSuccess } from "../utils/responseUtil.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getSales = asyncHandler(async (req, res) => {
  const sales = await saleService.getAllSales(req.query);
  return sendSuccess(res, "Sales retrieved successfully", sales);
});

export const getSale = asyncHandler(async (req, res) => {
  const sale = await saleService.getSaleById(req.params.id);
  return sendSuccess(res, "Sale details retrieved", sale);
});

export const createSale = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale(req.user, req.body);
  return sendSuccess(res, "Sale completed successfully", sale, 201);
});

export const voidSale = asyncHandler(async (req, res) => {
  const sale = await saleService.voidSale(req.user, req.params.id, req.body.reason);
  return sendSuccess(res, "Sale voided — stock and khata reversed", sale);
});
