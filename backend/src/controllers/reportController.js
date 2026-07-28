import * as reportService from "../services/reportService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getDashboardKpis = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await reportService.getDashboardKpis({ period, startDate, endDate });
    return sendSuccess(res, "Dashboard KPIs retrieved", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getSalesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await reportService.getSalesReport(from, to);
    return sendSuccess(res, "Sales report retrieved", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getInventoryReport = async (req, res) => {
  try {
    const data = await reportService.getInventoryReport();
    return sendSuccess(res, "Inventory valuation report retrieved", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getProfitLossReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const data = await reportService.getProfitLossReport(month, year);
    return sendSuccess(res, "Profit and Loss report retrieved", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getTopProductsReport = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await reportService.getTopProductsReport(limit);
    return sendSuccess(res, "Top products report retrieved", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
