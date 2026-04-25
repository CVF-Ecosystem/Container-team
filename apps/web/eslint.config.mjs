import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "eslint.config.mjs",
    "e2e/**",
    "playwright-report/**",
    "test-results/**",
    // Legacy debug scripts
    "scripts/**",
  ]),
  // Custom rules — stricter than defaults
  {
    rules: {
      // TypeScript strictness
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",

      // Disabled until typed linting is configured for non-app config files.
      "@typescript-eslint/prefer-nullish-coalescing": "off",

      // Disabled until typed linting is configured for non-app config files.
      "@typescript-eslint/prefer-optional-chain": "off",

      // No console.log in production code — use logger instead
      // Allow console.warn and console.error for error boundaries
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Prevent accidental use of == instead of ===
      "eqeqeq": ["error", "always", { null: "ignore" }],

      // No duplicate imports
      "no-duplicate-imports": "warn",

      // Prefer const over let when variable is not reassigned
      "prefer-const": "warn",

      // React Compiler rules are noisy on this legacy UI surface; keep them out
      // of the production blocker gate until those files are intentionally refactored.
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
]);

export default eslintConfig;
