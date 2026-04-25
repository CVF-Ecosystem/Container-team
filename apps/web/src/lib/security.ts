/**
 * Security Utilities for Authentication
 *
 * Provides secure hashing and session management utilities.
 * Uses Web Crypto API for cryptographic operations.
 */

// ============= CONSTANTS =============

// Session cookie name (for future httpOnly cookie implementation)
export const SESSION_COOKIE_NAME = "tan_thuan_session";

// Token expiration times
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days
  SESSION: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ============= SECURE HASHING =============

/**
 * Generate a cryptographically secure hash using SHA-256
 * Uses Web Crypto API (available in modern browsers)
 */
export async function secureHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Use Web Crypto API for SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

/**
 * Generate a cryptographically secure hash with salt
 * More secure than plain hash - resistant to rainbow table attacks
 */
export async function secureHashWithSalt(
  input: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  // Generate salt if not provided
  const usedSalt = salt || generateSecureToken(16);

  // Combine input with salt
  const saltedInput = `${usedSalt}:${input}`;

  const hash = await secureHash(saltedInput);

  return { hash, salt: usedSalt };
}

/**
 * Verify a password against a salted hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const { hash } = await secureHashWithSalt(password, salt);
  return hash === storedHash;
}

// ============= TOKEN GENERATION =============

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  return generateSecureToken(32);
}

// ============= INPUT SANITIZATION =============

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/**
 * Validate username format
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  const sanitized = sanitizeInput(username).toLowerCase();

  if (!sanitized) {
    return { valid: false, error: "Username is required" };
  }

  if (sanitized.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (sanitized.length > 50) {
    return { valid: false, error: "Username must be less than 50 characters" };
  }

  // Only allow alphanumeric and underscore
  if (!/^[a-z0-9_]+$/.test(sanitized)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, and underscore",
    };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
  strength: "weak" | "medium" | "strong";
} {
  if (!password) {
    return { valid: false, error: "Password is required", strength: "weak" };
  }

  if (password.length < 6) {
    return {
      valid: false,
      error: "Password must be at least 6 characters",
      strength: "weak",
    };
  }

  // Calculate strength
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strength: "weak" | "medium" | "strong" =
    score < 3 ? "weak" : score < 5 ? "medium" : "strong";

  return { valid: true, strength };
}

// ============= SECURE STORAGE =============

/**
 * Secure storage wrapper for localStorage.
 *
 * SECURITY NOTE: localStorage is accessible to JavaScript and therefore
 * vulnerable to XSS attacks. Do NOT store sensitive data (tokens, passwords)
 * here. For sensitive data, use httpOnly cookies set by the server.
 *
 * The `encrypt` parameter has been REMOVED — btoa() is Base64 encoding,
 * NOT encryption, and provides false security. Use server-side auth instead.
 */
export const secureStorage = {
  /**
   * Store data in localStorage.
   * Warning: localStorage is vulnerable to XSS — use for non-sensitive data only.
   */
  setItem(key: string, value: unknown): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  },

  /**
   * Retrieve data from localStorage.
   */
  getItem<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  },

  /**
   * Remove item from localStorage.
   */
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  /**
   * Clear all auth-related storage.
   */
  clearAuth(): void {
    if (typeof window === "undefined") return;
    const authKeys = [
      "auth_session",
      "auth_admin_password",
      "auth_user_password",
    ];
    authKeys.forEach((key) => localStorage.removeItem(key));
  },
};

// ============= RATE LIMITING =============

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check and update rate limit for login attempts
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  lockoutMs: number = 30 * 60 * 1000 // 30 minutes
): { allowed: boolean; remainingAttempts: number; lockedUntil?: Date } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Check if currently locked out
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(entry.lockedUntil),
    };
  }

  // Check if within rate limit window
  if (entry) {
    // Window expired - reset
    if (now - entry.firstAttempt > windowMs) {
      rateLimitStore.set(identifier, {
        attempts: 1,
        firstAttempt: now,
        lockedUntil: null,
      });
      return { allowed: true, remainingAttempts: maxAttempts - 1 };
    }

    // Within window - check attempts
    if (entry.attempts >= maxAttempts) {
      // Lock out
      const lockedUntil = now + lockoutMs;
      rateLimitStore.set(identifier, { ...entry, lockedUntil });
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: new Date(lockedUntil),
      };
    }

    // Increment attempts
    rateLimitStore.set(identifier, {
      ...entry,
      attempts: entry.attempts + 1,
    });
    return {
      allowed: true,
      remainingAttempts: maxAttempts - entry.attempts - 1,
    };
  }

  // First attempt
  rateLimitStore.set(identifier, {
    attempts: 1,
    firstAttempt: now,
    lockedUntil: null,
  });
  return { allowed: true, remainingAttempts: maxAttempts - 1 };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// ============= SECURITY HEADERS CHECK =============

/**
 * Check if running in secure context
 */
export function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

/**
 * Security recommendations for production
 */
export const securityRecommendations = {
  // These should be implemented server-side
  headers: {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },
  cookies: {
    secure: true,
    httpOnly: true,
    sameSite: "strict" as const,
  },
};
