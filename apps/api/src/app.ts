/**
 * Express app composition for Tan Thuan Port API.
 * Kept separate from server startup so route tests can import the app safely.
 */

import "express-async-errors";

import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { checkConnection, pool } from "./db/index.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/logger.js";
import { Sentry, isSentryConfigured } from "./lib/sentry.js";
import { swaggerSpec, swaggerUiOptions } from "./docs/swagger.js";
import {
  authRoutes,
  auditRoutes,
  dailyDataRoutes,
  employeesRoutes,
  opsRoutes,
  notificationRoutes,
  integrationRoutes,
  readinessRoutes,
  reportsRoutes,
  vesselsRoutes,
  statsRoutes,
} from "./routes/index.js";

async function getHealthStatus() {
  const dbHealthy = await checkConnection();

  return {
    status: dbHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbHealthy ? "connected" : "disconnected",
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    },
    sentry: {
      configured: isSentryConfigured(),
    },
    version: "1.0.0",
    environment: env.server.nodeEnv,
  };
}

export function createApp(): Express {
  const app: Express = express();

  // Request logging (first middleware to capture all requests)
  app.use(requestLogger);

  // Security
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.cors.origin,
      credentials: true,
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
  app.use("/api", limiter);

  // Cookie parsing (required for HTTP-only cookie auth)
  app.use(cookieParser());

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // API Documentation
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Health checks: /health for infrastructure, /api/v1/health for API clients.
  app.get("/health", async (_req, res) => {
    res.json(await getHealthStatus());
  });
  app.get("/api/v1/health", async (_req, res) => {
    res.json(await getHealthStatus());
  });

  // API routes - v1 (versioned)
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/audit", auditRoutes);
  app.use("/api/v1/daily-data", dailyDataRoutes);
  app.use("/api/v1/employees", employeesRoutes);
  app.use("/api/v1/ops", opsRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/integrations", integrationRoutes);
  app.use("/api/v1/readiness", readinessRoutes);
  app.use("/api/v1/reports", reportsRoutes);
  app.use("/api/v1/vessels", vesselsRoutes);
  app.use("/api/v1/stats", statsRoutes);

  // Backward compatibility aliases (deprecated - will be removed in v2)
  app.use("/api/auth", authRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/daily-data", dailyDataRoutes);
  app.use("/api/employees", employeesRoutes);
  app.use("/api/ops", opsRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/integrations", integrationRoutes);
  app.use("/api/readiness", readinessRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/vessels", vesselsRoutes);
  app.use("/api/stats", statsRoutes);

  app.use(notFoundHandler);
  Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}
