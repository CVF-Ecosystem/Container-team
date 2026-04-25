/**
 * Tan Thuan Port API Server
 * Express.js + PostgreSQL REST API
 */

import { initSentry } from "./lib/sentry.js";
initSentry();

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/index.js";

const PORT = env.server.port;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     🚢 Tan Thuan Port API Server           ║
╠════════════════════════════════════════════╣
║  Environment: ${env.server.nodeEnv.padEnd(26)}║
║  Port:        ${String(PORT).padEnd(26)}║
║  CORS:        ${env.cors.origin.padEnd(26)}║
╚════════════════════════════════════════════╝
  `);
});

/**
 * Graceful shutdown handler
 * - Stops accepting new connections
 * - Waits for existing requests to complete
 * - Drains database connection pool
 * - Exits cleanly
 */
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("HTTP server closed.");

    try {
      await pool.end();
      console.log("Database pool drained.");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
