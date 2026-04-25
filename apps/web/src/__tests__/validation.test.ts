/**
 * Unit Tests for validation utilities
 */

import { describe, it, expect } from "vitest";
import {
  isValidDate,
  isValidDateRange,
  isPositiveInteger,
  isNonNegativeNumber,
  isInRange,
  isNonEmptyString,
  hasValidLength,
  isAlphanumericVietnamese,
  isOneOf,
  isValidShiftId,
  isValidTeam,
  isValidContainerSize,
  validateDashboardFilters,
  validateReportEntry,
  sanitizeString,
  sanitizeNumber,
  sanitizeInteger,
  clamp,
} from "@/lib/validation";

// ============= DATE VALIDATION =============

describe("isValidDate", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDate("2025-01-15")).toBe(true);
    expect(isValidDate("2024-12-31")).toBe(true);
    expect(isValidDate("2026-02-28")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDate("15/01/2025")).toBe(false);
    expect(isValidDate("2025-1-5")).toBe(false);
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(isValidDate("2025-13-01")).toBe(false);
    expect(isValidDate("2025-02-30")).toBe(false);
  });
});

describe("isValidDateRange", () => {
  it("accepts valid date ranges", () => {
    const result = isValidDateRange("2025-01-01", "2025-12-31");
    expect(result.valid).toBe(true);
  });

  it("rejects when start > end", () => {
    const result = isValidDateRange("2025-12-31", "2025-01-01");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("trước");
  });

  it("rejects ranges exceeding maxRangeDays", () => {
    const result = isValidDateRange("2024-01-01", "2025-12-31", 365);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("365");
  });

  it("rejects invalid dates", () => {
    const result = isValidDateRange("invalid", "2025-12-31");
    expect(result.valid).toBe(false);
  });
});

// ============= NUMBER VALIDATION =============

describe("isPositiveInteger", () => {
  it("accepts positive integers", () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(100)).toBe(true);
  });

  it("rejects zero, negatives, and non-integers", () => {
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-1)).toBe(false);
    expect(isPositiveInteger(1.5)).toBe(false);
    expect(isPositiveInteger("1" as unknown as number)).toBe(false);
  });
});

describe("isNonNegativeNumber", () => {
  it("accepts zero and positive numbers", () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(100)).toBe(true);
    expect(isNonNegativeNumber(1.5)).toBe(true);
  });

  it("rejects negatives and non-numbers", () => {
    expect(isNonNegativeNumber(-1)).toBe(false);
    expect(isNonNegativeNumber(NaN)).toBe(false);
    expect(isNonNegativeNumber("0" as unknown as number)).toBe(false);
  });
});

describe("isInRange", () => {
  it("accepts values within range", () => {
    expect(isInRange(5, 1, 10)).toBe(true);
    expect(isInRange(1, 1, 10)).toBe(true);
    expect(isInRange(10, 1, 10)).toBe(true);
  });

  it("rejects values outside range", () => {
    expect(isInRange(0, 1, 10)).toBe(false);
    expect(isInRange(11, 1, 10)).toBe(false);
  });
});

// ============= STRING VALIDATION =============

describe("isNonEmptyString", () => {
  it("accepts non-empty strings", () => {
    expect(isNonEmptyString("hello")).toBe(true);
    expect(isNonEmptyString("  a  ")).toBe(true);
  });

  it("rejects empty strings and non-strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(null as unknown as string)).toBe(false);
  });
});

describe("hasValidLength", () => {
  it("accepts strings within length bounds", () => {
    expect(hasValidLength("hello", 1, 10)).toBe(true);
    expect(hasValidLength("a", 1, 10)).toBe(true);
  });

  it("rejects strings outside length bounds", () => {
    expect(hasValidLength("", 1, 10)).toBe(false);
    expect(hasValidLength("hello world!", 1, 5)).toBe(false);
  });
});

describe("isAlphanumericVietnamese", () => {
  it("accepts Vietnamese text", () => {
    expect(isAlphanumericVietnamese("Nguyễn Văn A")).toBe(true);
    expect(isAlphanumericVietnamese("Tân Thuận")).toBe(true);
    expect(isAlphanumericVietnamese("ABC-123")).toBe(true);
  });

  it("rejects strings with special characters", () => {
    expect(isAlphanumericVietnamese("hello@world")).toBe(false);
    expect(isAlphanumericVietnamese("test<script>")).toBe(false);
  });
});

// ============= ENUM VALIDATION =============

describe("isOneOf", () => {
  it("accepts values in the allowed list", () => {
    expect(isOneOf("a", ["a", "b", "c"])).toBe(true);
  });

  it("rejects values not in the list", () => {
    expect(isOneOf("d", ["a", "b", "c"])).toBe(false);
  });
});

describe("isValidShiftId", () => {
  it("accepts valid shift IDs", () => {
    expect(isValidShiftId("1")).toBe(true);
    expect(isValidShiftId("2")).toBe(true);
    expect(isValidShiftId("3")).toBe(true);
  });

  it("rejects invalid shift IDs", () => {
    expect(isValidShiftId("4")).toBe(false);
    expect(isValidShiftId("0")).toBe(false);
    expect(isValidShiftId(1 as unknown as string)).toBe(false);
  });
});

describe("isValidTeam", () => {
  it("accepts valid teams", () => {
    ["A", "B", "C", "D"].forEach((t) => expect(isValidTeam(t)).toBe(true));
  });

  it("rejects invalid teams", () => {
    expect(isValidTeam("E")).toBe(false);
    expect(isValidTeam("a")).toBe(false);
  });
});

describe("isValidContainerSize", () => {
  it("accepts valid container sizes", () => {
    ["20", "40", "45"].forEach((s) =>
      expect(isValidContainerSize(s)).toBe(true)
    );
  });

  it("rejects invalid sizes", () => {
    expect(isValidContainerSize("30")).toBe(false);
    expect(isValidContainerSize(20 as unknown as string)).toBe(false);
  });
});

// ============= FORM VALIDATION =============

describe("validateDashboardFilters", () => {
  it("accepts valid filters", () => {
    const result = validateDashboardFilters({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      shift: "1",
      team: "A",
    });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("rejects invalid date range", () => {
    const result = validateDashboardFilters({
      startDate: "2025-12-31",
      endDate: "2025-01-01",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.dateRange).toBeDefined();
  });

  it("rejects invalid shift", () => {
    const result = validateDashboardFilters({ shift: "5" });
    expect(result.valid).toBe(false);
    expect(result.errors.shift).toBeDefined();
  });

  it("accepts empty filters", () => {
    const result = validateDashboardFilters({});
    expect(result.valid).toBe(true);
  });
});

describe("validateReportEntry", () => {
  it("accepts valid report entry", () => {
    const result = validateReportEntry({
      container20: 10,
      container40: 5,
      vesselCount: 2,
      notes: "Test note",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects negative container counts", () => {
    const result = validateReportEntry({ container20: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.container20).toBeDefined();
  });

  it("rejects notes exceeding 1000 chars", () => {
    const result = validateReportEntry({ notes: "a".repeat(1001) });
    expect(result.valid).toBe(false);
    expect(result.errors.notes).toBeDefined();
  });
});

// ============= SANITIZATION =============

describe("sanitizeString", () => {
  it("trims whitespace and collapses spaces", () => {
    expect(sanitizeString("  hello   world  ")).toBe("hello world");
    expect(sanitizeString("test")).toBe("test");
  });

  it("handles non-string input", () => {
    expect(sanitizeString(null as unknown as string)).toBe("");
  });
});

describe("sanitizeNumber", () => {
  it("returns number as-is", () => {
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber(0)).toBe(0);
  });

  it("parses string numbers", () => {
    expect(sanitizeNumber("42")).toBe(42);
    expect(sanitizeNumber("3.14")).toBe(3.14);
  });

  it("returns default for invalid input", () => {
    expect(sanitizeNumber("abc")).toBe(0);
    expect(sanitizeNumber(null)).toBe(0);
    expect(sanitizeNumber(undefined, 99)).toBe(99);
  });
});

describe("sanitizeInteger", () => {
  it("floors decimal numbers", () => {
    expect(sanitizeInteger(3.7)).toBe(3);
    expect(sanitizeInteger(3.2)).toBe(3);
  });
});

describe("clamp", () => {
  it("clamps values to range", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(15, 1, 10)).toBe(10);
  });
});
