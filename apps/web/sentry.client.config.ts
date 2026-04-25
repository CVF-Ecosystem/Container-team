/**
 * Sentry Client-Side Configuration
 * Loaded by Next.js on the browser side.
 *
 * To activate: Set NEXT_PUBLIC_SENTRY_DSN in .env.local
 * Get DSN from: https://sentry.io/settings/projects/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay — capture 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment tagging
  environment: process.env.NODE_ENV,

  // Only send errors in production (disable in development to avoid noise)
  enabled: process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filter out non-actionable errors
  beforeSend(event) {
    // Don't send network errors (user offline)
    if (event.exception?.values?.[0]?.type === "NetworkError") {
      return null;
    }
    // Don't send chunk load errors (browser caching issues)
    if (event.exception?.values?.[0]?.value?.includes("ChunkLoadError")) {
      return null;
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and inputs for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
