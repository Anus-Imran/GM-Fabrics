/**
 * Operational error with an HTTP status. Anything thrown that is not an AppError
 * is treated as an unexpected server error and its message is hidden in production.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

export const badRequest = (message, errors = null) => new AppError(message, 400, errors);
export const notFound = (message = "Record not found") => new AppError(message, 404);
export const forbidden = (message = "You do not have permission to do this") => new AppError(message, 403);
export const conflict = (message) => new AppError(message, 409);
