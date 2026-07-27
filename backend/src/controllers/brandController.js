import * as brandService from "../services/brandService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getBrands = async (req, res) => {
  try {
    const brands = await brandService.getAllBrands();
    return sendSuccess(res, "Brands retrieved successfully", brands);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createBrand = async (req, res) => {
  try {
    const { name, country, notes } = req.body;
    if (!name) return sendError(res, "Brand name is required", 400);
    const brand = await brandService.createBrand({ name, country, notes });
    return sendSuccess(res, "Brand created successfully", brand, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateBrand = async (req, res) => {
  try {
    const brand = await brandService.updateBrand(req.params.id, req.body);
    return sendSuccess(res, "Brand updated successfully", brand);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteBrand = async (req, res) => {
  try {
    await brandService.deleteBrand(req.params.id);
    return sendSuccess(res, "Brand deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
