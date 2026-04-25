/**
 * Sentry Server-Side Configuration
 * Loaded by Next.js on the server side (Server Components, API Routes, etc.)
 *
 * To activate: Set SENTRY_DSN in .env.local (server-side, not NEXT_PUBLIC_)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Environment tagging
  environment: process.env.NODE_ENV,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production" && !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
});
