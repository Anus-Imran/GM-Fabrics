import * as returnService from "../services/returnService.js";
import { sendSuccess } from "../utils/responseUtil.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createReturn = asyncHandler(async (req, res) => {
  const returnRecord = await returnService.createReturn(req.user, req.body);
  return sendSuccess(res, "Return processed and stock restocked", returnRecord, 201);
});

export const getReturn = asyncHandler(async (req, res) => {
  const returnRecord = await returnService.getReturnById(req.params.id);
  return sendSuccess(res, "Return details retrieved", returnRecord);
});

export const getSaleReturns = asyncHandler(async (req, res) => {
  const returns = await returnService.getReturnsBySaleId(req.params.saleId);
  return sendSuccess(res, "Sale returns retrieved", returns);
});

export const getAllReturns = asyncHandler(async (req, res) => {
  const returns = await returnService.getAllReturns(req.query);
  return sendSuccess(res, "All returns retrieved", returns);
});

export const deleteReturn = asyncHandler(async (req, res) => {
  const result = await returnService.deleteReturn(req.user, req.params.id);
  return sendSuccess(res, "Return deleted and stock adjusted successfully", result);
});
