import * as aiService from "../services/aiService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getLowStockSuggestions = async (req, res) => {
  try {
    const data = await aiService.getLowStockSuggestions();
    return sendSuccess(res, "Low stock AI reorder suggestions", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getDailySummary = async (req, res) => {
  try {
    const data = await aiService.getDailySummary();
    return sendSuccess(res, "AI daily business summary", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getDemandForecast = async (req, res) => {
  try {
    const data = await aiService.getDemandForecast();
    return sendSuccess(res, "AI demand forecasting analysis", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getCustomerInsights = async (req, res) => {
  try {
    const data = await aiService.getCustomerInsights();
    return sendSuccess(res, "AI customer behavior insights", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const queryAiAssistant = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return sendError(res, "Query prompt is required", 400);
    const data = await aiService.queryAiAssistant(prompt);
    return sendSuccess(res, "AI assistant response", data);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const checkAnomalies = async (req, res) => {
  try {
    const data = await aiService.checkAnomalies();
    return sendSuccess(res, "AI anomaly detection scan completed", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getAiLogs = async (req, res) => {
  try {
    const data = await aiService.getAiLogs();
    return sendSuccess(res, "AI action logs retrieved", data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
