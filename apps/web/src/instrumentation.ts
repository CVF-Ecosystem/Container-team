/**
 * Next.js Instrumentation Hook
 * Called once when the Next.js server starts (nodejs runtime).
 * This is the required entry point to activate sentry.server.config.ts.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
}

/**
 * Automatically capture server-side request errors into Sentry.
 * Activated in Next.js 15+ App Router.
 */
export const onRequestError = Sentry.captureRequestError;
