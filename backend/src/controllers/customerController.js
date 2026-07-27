import * as customerService from "../services/customerService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getCustomers = async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers(req.query.search);
    return sendSuccess(res, "Customers retrieved successfully", customers);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getCustomer = async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    return sendSuccess(res, "Customer details retrieved", customer);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "Customer name is required", 400);
    const customer = await customerService.createCustomer(req.body);
    return sendSuccess(res, "Customer created successfully", customer, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return sendSuccess(res, "Customer updated successfully", customer);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    await customerService.deleteCustomer(req.params.id);
    return sendSuccess(res, "Customer deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const settleBalance = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    if (!amount) return sendError(res, "Payment amount is required", 400);
    const customer = await customerService.settleCustomerBalance(req.params.id, { amount, notes });
    return sendSuccess(res, "Customer balance payment recorded successfully", customer);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
