/**
 * Sentry Error Tracking — API Server
 * Must be initialised before any other imports in index.ts.
 *
 * Activation: set SENTRY_DSN in the production environment.
 * No-op when SENTRY_DSN is absent or NODE_ENV !== 'production'.
 */

import * as Sentry from "@sentry/node";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    enabled: process.env.NODE_ENV === "production" && !!dsn,
  });
}

export { Sentry };

/**
 * True when Sentry DSN is present — used by the health endpoint for readiness.
 */
export function isSentryConfigured(): boolean {
  return !!process.env.SENTRY_DSN;
}
