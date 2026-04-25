/**
 * Unit Tests for security utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  secureHash,
  secureHashWithSalt,
  verifyPassword,
  generateSecureToken,
  sanitizeInput,
  validateUsername,
  validatePassword,
  checkRateLimit,
  resetRateLimit,
} from "@/lib/security";

// ============= HASHING =============

describe("secureHash", () => {
  it("produces a 64-character hex string (SHA-256)", async () => {
    const hash = await secureHash("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("produces consistent hashes for same input", async () => {
    const hash1 = await secureHash("password123");
    const hash2 = await secureHash("password123");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await secureHash("password1");
    const hash2 = await secureHash("password2");
    expect(hash1).not.toBe(hash2);
  });
});

describe("secureHashWithSalt", () => {
  it("returns hash and salt", async () => {
    const { hash, salt } = await secureHashWithSalt("password");
    expect(hash).toHaveLength(64);
    expect(salt).toBeTruthy();
    expect(salt.length).toBeGreaterThan(0);
  });

  it("produces different hashes for same password with different salts", async () => {
    const { hash: hash1 } = await secureHashWithSalt("password");
    const { hash: hash2 } = await secureHashWithSalt("password");
    // Different salts → different hashes
    expect(hash1).not.toBe(hash2);
  });

  it("produces same hash when same salt is provided", async () => {
    const { hash: hash1, salt } = await secureHashWithSalt("password");
    const { hash: hash2 } = await secureHashWithSalt("password", salt);
    expect(hash1).toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const { hash, salt } = await secureHashWithSalt("mypassword");
    const result = await verifyPassword("mypassword", hash, salt);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const { hash, salt } = await secureHashWithSalt("mypassword");
    const result = await verifyPassword("wrongpassword", hash, salt);
    expect(result).toBe(false);
  });
});

// ============= TOKEN GENERATION =============

describe("generateSecureToken", () => {
  it("generates token of correct length", () => {
    const token = generateSecureToken(32);
    // 32 bytes → 64 hex chars
    expect(token).toHaveLength(64);
  });

  it("generates unique tokens", () => {
    const token1 = generateSecureToken(16);
    const token2 = generateSecureToken(16);
    expect(token1).not.toBe(token2);
  });

  it("generates hex string", () => {
    const token = generateSecureToken(16);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });
});

// ============= INPUT SANITIZATION =============

describe("sanitizeInput", () => {
  it("escapes HTML special characters", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
    );
    expect(sanitizeInput('He said "hello"')).toBe("He said &quot;hello&quot;");
    expect(sanitizeInput("a & b")).toBe("a &amp; b");
  });

  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });
});

// ============= USERNAME VALIDATION =============

describe("validateUsername", () => {
  it("accepts valid usernames", () => {
    expect(validateUsername("admin").valid).toBe(true);
    expect(validateUsername("user_123").valid).toBe(true);
    expect(validateUsername("abc").valid).toBe(true);
  });

  it("rejects too short usernames", () => {
    const result = validateUsername("ab");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("3");
  });

  it("rejects too long usernames", () => {
    const result = validateUsername("a".repeat(51));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("50");
  });

  it("rejects usernames with special characters", () => {
    const result = validateUsername("user@name");
    expect(result.valid).toBe(false);
  });

  it("rejects empty username", () => {
    const result = validateUsername("");
    expect(result.valid).toBe(false);
  });
});

// ============= PASSWORD VALIDATION =============

describe("validatePassword", () => {
  it("accepts valid passwords", () => {
    const result = validatePassword("password123");
    expect(result.valid).toBe(true);
  });

  it("rejects too short passwords", () => {
    const result = validatePassword("abc");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("6");
  });

  it("rejects empty password", () => {
    const result = validatePassword("");
    expect(result.valid).toBe(false);
  });

  it("calculates password strength correctly", () => {
    const weak = validatePassword("abc123");
    expect(weak.strength).toBe("weak");

    const medium = validatePassword("Abc12345");
    expect(["medium", "strong"]).toContain(medium.strength);

    const strong = validatePassword("Abc123!@#$%");
    expect(strong.strength).toBe("strong");
  });
});

// ============= RATE LIMITING =============

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Reset rate limit before each test
    resetRateLimit("test-user");
  });

  it("allows first attempt", () => {
    const result = checkRateLimit("test-user", 5);
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(4);
  });

  it("decrements remaining attempts", () => {
    checkRateLimit("test-user", 5);
    checkRateLimit("test-user", 5);
    const result = checkRateLimit("test-user", 5);
    expect(result.remainingAttempts).toBe(2);
  });

  it("blocks after max attempts", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-user", 5);
    }
    const result = checkRateLimit("test-user", 5);
    expect(result.allowed).toBe(false);
    expect(result.remainingAttempts).toBe(0);
    expect(result.lockedUntil).toBeDefined();
  });

  it("resets after resetRateLimit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-user", 5);
    }
    resetRateLimit("test-user");
    const result = checkRateLimit("test-user", 5);
    expect(result.allowed).toBe(true);
  });
});
