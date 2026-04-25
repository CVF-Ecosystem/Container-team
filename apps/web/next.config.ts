import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(appDir, "../..");

// Security headers for production hardening
const securityHeaders = [
  // Prevent DNS prefetch leaking info
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Force HTTPS for 2 years (only in production)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Control referrer information
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-eval in development; restrict in production
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Allow API connections: use NEXT_PUBLIC_API_URL in production, fallback to localhost in dev
      process.env.NEXT_PUBLIC_API_URL
        ? `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL}`
        : "connect-src 'self' http://localhost:3001 https://localhost:3001",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },

  // Remove X-Powered-By header to avoid fingerprinting
  poweredByHeader: false,

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Compress responses
  compress: true,

  // Strict mode for React
  reactStrictMode: true,
};

// Wrap with Sentry for source maps and performance monitoring
// Only active when SENTRY_AUTH_TOKEN is set (CI/CD environment)
export default withSentryConfig(nextConfig, {
  // Sentry organization and project (set in CI/CD secrets)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps only in CI (not in local dev)
  silent: !process.env.CI,

  // Disable source map upload if no auth token (local dev)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },

  // Tunnel Sentry requests through Next.js to avoid ad blockers
  tunnelRoute: "/monitoring",
});
