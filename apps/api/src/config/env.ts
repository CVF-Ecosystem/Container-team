/**
 * Environment Configuration
 */

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().default("5432"),
  DB_NAME: z.string().default("tanthuan"),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("postgres"),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Server
  PORT: z.string().default("3001"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Web Push notifications
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@tanthuanport.local"),

  // Machine-to-machine integration API
  INTEGRATION_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  database: {
    url: parsed.data.DATABASE_URL,
    host: parsed.data.DB_HOST,
    port: parseInt(parsed.data.DB_PORT, 10),
    name: parsed.data.DB_NAME,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
  },
  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
  },
  server: {
    port: parseInt(parsed.data.PORT, 10),
    nodeEnv: parsed.data.NODE_ENV,
    isDev: parsed.data.NODE_ENV === "development",
    isProd: parsed.data.NODE_ENV === "production",
  },
  cors: {
    origin: parsed.data.CORS_ORIGIN,
  },
  push: {
    vapidPublicKey: parsed.data.VAPID_PUBLIC_KEY,
    vapidPrivateKey: parsed.data.VAPID_PRIVATE_KEY,
    vapidSubject: parsed.data.VAPID_SUBJECT,
    configured:
      Boolean(parsed.data.VAPID_PUBLIC_KEY) &&
      Boolean(parsed.data.VAPID_PRIVATE_KEY),
  },
  integrations: {
    apiKey: parsed.data.INTEGRATION_API_KEY,
    configured: Boolean(parsed.data.INTEGRATION_API_KEY),
  },
};
