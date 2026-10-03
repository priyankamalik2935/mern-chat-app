import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";


export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};


export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors;

  if (err.name === "CastError") {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    statusCode = 400;
  }

  if (err.name === "ValidationError") {
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    statusCode = 400;
  }

  if (err.name === "JsonWebTokenError") {
    message = "Invalid token";
    statusCode = 401;
  }
  if (err.name === "TokenExpiredError") {
    message = "Token expired";
    statusCode = 401;
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    message = "File too large";
    statusCode = 400;
  }

  if (env.NODE_ENV === "development") {
    console.error("❌ Error:", {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};


export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export { ApiError };