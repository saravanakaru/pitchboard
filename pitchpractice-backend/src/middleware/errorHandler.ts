import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number; // Add code property for MongoDB error codes
  keyValue?: any; // Add for MongoDB duplicate key errors
  errors?: any; // Add for Mongoose validation errors
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error("Error:", {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Mongoose bad ObjectId (CastError)
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = createError(message, 404);
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = createError(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors || {})
      .map((val: any) => val.message)
      .join(", ");
    error = createError(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = createError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = createError(message, 401);
  }

  // Default to 500 server error
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

export const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
  error.isOperational = true;
  return error;
};

export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Utility function for throwing operational errors
export const throwError = (
  message: string,
  statusCode: number = 500
): never => {
  const error = createError(message, statusCode);
  throw error;
};
