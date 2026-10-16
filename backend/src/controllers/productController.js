import * as productService from "../services/productService.js";
import { sendSuccess } from "../utils/responseUtil.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/appError.js";

export const getProducts = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts(req.query, req.user);
  return sendSuccess(res, "Products retrieved successfully", products);
});

export const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await productService.getLowStockProducts();
  return sendSuccess(res, "Low stock products retrieved", products);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id, req.user);
  return sendSuccess(res, "Product details retrieved", product);
});

export const searchProducts = asyncHandler(async (req, res) => {
  const { q, barcode } = req.query;
  const products = await productService.searchProducts(q || barcode || "", req.user);
  return sendSuccess(res, "Search results", products);
});

export const getByCode = asyncHandler(async (req, res) => {
  const product = await productService.findByCode(req.params.code, req.user);
  if (!product) throw notFound(`No product with barcode / SKU "${req.params.code}"`);
  return sendSuccess(res, "Product found", product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.user, req.body);
  return sendSuccess(res, "Product created successfully", product, 201);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.user, req.params.id, req.body);
  return sendSuccess(res, "Product updated successfully", product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.user, req.params.id);
  return sendSuccess(res, "Product deactivated successfully");
});

export const getProductPriceHistory = asyncHandler(async (req, res) => {
  const history = await productService.getProductPriceHistory(req.params.id);
  return sendSuccess(res, "Product price history retrieved", history);
});
