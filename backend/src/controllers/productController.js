import * as productService from "../services/productService.js";
import { sendSuccess, sendError } from "../utils/responseUtil.js";

export const getProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(req.query);
    return sendSuccess(res, "Products retrieved successfully", products);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const products = await productService.getLowStockProducts();
    return sendSuccess(res, "Low stock products retrieved", products);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return sendSuccess(res, "Product details retrieved", product);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { q, barcode } = req.query;
    const query = q || barcode || "";
    const products = await productService.searchProducts(query);
    return sendSuccess(res, "Search results", products);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, categoryId, unitId, salePrice } = req.body;
    if (!name || !categoryId || !unitId || salePrice === undefined) {
      return sendError(res, "Name, category, unit, and sale price are required", 400);
    }
    const product = await productService.createProduct(req.body);
    return sendSuccess(res, "Product created successfully", product, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return sendSuccess(res, "Product updated successfully", product);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    return sendSuccess(res, "Product deactivated successfully");
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const getProductPriceHistory = async (req, res) => {
  try {
    const history = await productService.getProductPriceHistory(req.params.id);
    return sendSuccess(res, "Product price history retrieved", history);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};
