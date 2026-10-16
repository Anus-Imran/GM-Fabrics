import { ZodError } from "zod";
import { sendError } from "../utils/responseUtil.js";

const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

const formatZodIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

export const notFoundHandler = (req, res) => sendError(res, `Route ${req.method} ${req.path} not found`, 404);

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    const errors = formatZodIssues(err);
    const first = errors[0];
    const message = first ? `${first.field ? `${first.field}: ` : ""}${first.message}` : "Invalid request data";
    return sendError(res, message, 400, errors);
  }

  if (err.type === "entity.parse.failed") {
    return sendError(res, "Request body is not valid JSON", 400);
  }
  if (err.type === "entity.too.large") {
    return sendError(res, "Request body is too large", 413);
  }

  // Known Prisma errors
  if (err.code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : err.meta?.target || "value";
    return sendError(res, `A record with this ${target} already exists`, 409);
  }
  if (err.code === "P2025") {
    return sendError(res, "Record not found", 404);
  }
  if (err.code === "P2003") {
    return sendError(res, "This record is linked to other records and cannot be changed or removed", 409);
  }
  if (err.code === "P2028" || err.code === "P2034") {
    return sendError(res, "The server is busy with another transaction, please try again", 503);
  }

  if (err.isOperational) {
    return sendError(res, err.message, err.statusCode || 400, err.errors || null);
  }

  console.error("Unhandled Error:", err);
  return sendError(res, isProduction ? "Internal Server Error" : err.message || "Internal Server Error", 500);
};
