/**
 * PostgreSQL Database Connection
 */

import { Pool, PoolClient, PoolConfig } from "pg";
import { env } from "../config/env.js";

const poolConfig: PoolConfig = env.database.url
  ? {
      connectionString: env.database.url,
      // Enable SSL for production cloud databases (Supabase, Neon, RDS, etc.)
      ssl: env.server.isProd ? { rejectUnauthorized: true } : false,
    }
  : {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
      // SSL for production
      ssl: env.server.isProd ? { rejectUnauthorized: true } : false,
    };

export const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  if (env.server.isDev) {
    console.log("📦 New database connection established");
  }
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
});

/**
 * Execute a query with parameters
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (env.server.isDev) {
    console.log("📊 Query executed:", {
      text: text.substring(0, 100),
      duration,
      rows: result.rowCount,
    });
  }

  return result.rows as T[];
}

/**
 * Execute a single-row query
 */
export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute query and return affected row count
 */
export async function execute(
  text: string,
  params?: unknown[]
): Promise<number> {
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
}

/**
 * Transaction helper
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
