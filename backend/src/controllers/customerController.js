import * as customerService from "../services/customerService.js";
import { sendSuccess } from "../utils/responseUtil.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCustomers = asyncHandler(async (req, res) => {
  const customers = await customerService.getAllCustomers(req.query);
  return sendSuccess(res, "Customers retrieved successfully", customers);
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return sendSuccess(res, "Customer details retrieved", customer);
});

export const getLedger = asyncHandler(async (req, res) => {
  const ledger = await customerService.getCustomerLedger(req.params.id, req.query);
  return sendSuccess(res, "Khata statement retrieved", ledger);
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.user, req.body);
  return sendSuccess(res, "Customer created successfully", customer, 201);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.user, req.params.id, req.body);
  return sendSuccess(res, "Customer updated successfully", customer);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.user, req.params.id);
  return sendSuccess(res, "Customer deleted successfully");
});

export const settleBalance = asyncHandler(async (req, res) => {
  const customer = await customerService.settleCustomerBalance(req.user, req.params.id, req.body);
  return sendSuccess(res, "Customer balance payment recorded successfully", customer);
});

export const adjustBalance = asyncHandler(async (req, res) => {
  const customer = await customerService.adjustCustomerBalance(req.user, req.params.id, req.body);
  return sendSuccess(res, "Khata balance adjusted", customer);
});
