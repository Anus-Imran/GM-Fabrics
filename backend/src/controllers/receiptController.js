import * as receiptService from "../services/receiptService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getReceipt = async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptBySaleId(req.params.saleId);
    return sendSuccess(res, "Receipt details retrieved", receipt);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const printReceipt = async (req, res) => {
  try {
    const receipt = await receiptService.printReceipt(req.params.saleId);
    return sendSuccess(res, "Receipt print count incremented", receipt);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
