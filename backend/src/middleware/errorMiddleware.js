import { sendError } from "../utils/responseUtil.js";

export const errorHandler = (err, req, res, next) => {
  console.error("Unhandled Error:", err);

  const origin = req.headers?.origin || "*";
  if (res.setHeader && !res.headersSent) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return sendError(res, message, statusCode, err.errors || null);
};
