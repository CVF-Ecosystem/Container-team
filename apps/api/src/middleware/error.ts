/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function isDatabaseConnectionError(err: Error): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  const message = err.message.toLowerCase();

  return (
    code === "28P01" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    message.includes("password authentication failed") ||
    message.includes("database") ||
    message.includes("connect")
  );
}

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
  });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn(
      { statusCode: err.statusCode, message: err.message },
      "Operational request error"
    );
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  logger.error({ err }, "Unhandled request error");

  if (isDatabaseConnectionError(err)) {
    res.status(503).json({
      error: "Database unavailable. Please check API database configuration.",
    });
    return;
  }

  // PostgreSQL errors
  if ((err as NodeJS.ErrnoException).code === "23505") {
    res.status(409).json({
      error: "Duplicate entry",
    });
    return;
  }

  if ((err as NodeJS.ErrnoException).code === "23503") {
    res.status(400).json({
      error: "Referenced record not found",
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: env.server.isProd ? "Internal server error" : err.message,
    ...(env.server.isDev && { stack: err.stack }),
  });
}
