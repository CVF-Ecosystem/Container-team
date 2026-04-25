/**
 * Request Logger Middleware
 * Uses pino-http for structured JSON logging.
 */

import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env.js";

// Create pino logger instance
export const logger = pino({
  level: env.server.isDev ? "debug" : "info",
  transport: env.server.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  // Redact sensitive fields from logs
  redact: {
    paths: [
      "req.headers.authorization",
      "req.body.password",
      "req.body.token",
      "req.body.currentPassword",
      "req.body.newPassword",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * HTTP request logger middleware using pino-http
 * Logs method, URL, status code, response time
 * Production-safe: sensitive data is redacted
 */
export const requestLogger = pinoHttp({
  logger,
  // Custom log level based on response status
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    if (res.statusCode >= 300) return "silent"; // Don't log redirects
    return "info";
  },
  // Serialize only safe request/response fields
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // Don't log request body (may contain sensitive data)
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Don't log health check requests (too noisy)
  autoLogging: {
    ignore: (req) => req.url === "/health",
  },
});
