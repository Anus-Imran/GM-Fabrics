import * as categoryService from "../services/categoryService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    return sendSuccess(res, "Categories retrieved successfully", categories);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, "Category name is required", 400);
    const category = await categoryService.createCategory({ name });
    return sendSuccess(res, "Category created successfully", category, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, "Category updated successfully", category);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    return sendSuccess(res, "Category deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};
