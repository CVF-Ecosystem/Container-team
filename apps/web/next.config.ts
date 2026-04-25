import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

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
      // Mainline app traffic is API-first; legacy Supabase paths are not part of the CSP baseline.
      "connect-src 'self' http://localhost:3001 https://localhost:3001",
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

  webpack: (config) => {
    // @e965/xlsx has "sideEffects":false + ESM entry (xlsx.mjs). Webpack 5 tree-shakes
    // away var declarations the library still references at runtime → "r is not defined".
    //
    // Fix A: alias to CJS entry (xlsx.js). _require.resolve follows Node module resolution
    //   so it works regardless of whether the package is hoisted in a monorepo.
    // Fix B: mark the xlsx subtree as having side effects to stop any residual tree-shaking.
    try {
      config.resolve.alias["@e965/xlsx"] = _require.resolve("@e965/xlsx/xlsx.js");
    } catch {
      // Fallback to relative path if subpath resolve fails
      config.resolve.alias["@e965/xlsx"] = resolve(appDir, "node_modules/@e965/xlsx/xlsx.js");
    }
    config.module.rules.push({
      test: /node_modules[\\/]@e965[\\/]xlsx[\\/]/,
      sideEffects: true,
    });
    return config;
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
