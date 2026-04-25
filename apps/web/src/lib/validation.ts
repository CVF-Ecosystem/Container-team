/**
 * Validation Utilities
 * Input validation and sanitization for forms and filters
 */

// ============= DATE VALIDATION =============

/**
 * Validate date string in format YYYY-MM-DD
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const [yearPart, monthPart, dayPart] = dateStr.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date instanceof Date &&
    !isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Validate date range (start <= end, within reasonable bounds)
 */
export function isValidDateRange(
  startDate: string,
  endDate: string,
  maxRangeDays = 365
): { valid: boolean; error?: string } {
  if (!isValidDate(startDate)) {
    return { valid: false, error: "Ngày bắt đầu không hợp lệ" };
  }

  if (!isValidDate(endDate)) {
    return { valid: false, error: "Ngày kết thúc không hợp lệ" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return { valid: false, error: "Ngày bắt đầu phải trước ngày kết thúc" };
  }

  const diffDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > maxRangeDays) {
    return {
      valid: false,
      error: `Khoảng thời gian không được vượt quá ${maxRangeDays} ngày`,
    };
  }

  return { valid: true };
}

// ============= NUMBER VALIDATION =============

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  if (typeof value !== "number") return false;
  return Number.isInteger(value) && value > 0;
}

/**
 * Validate non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  if (typeof value !== "number") return false;
  return !isNaN(value) && value >= 0;
}

/**
 * Validate number in range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === "number" && value >= min && value <= max;
}

// ============= STRING VALIDATION =============

/**
 * Validate non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate string length
 */
export function hasValidLength(
  value: string,
  min: number,
  max: number
): boolean {
  if (typeof value !== "string") return false;
  const len = value.trim().length;
  return len >= min && len <= max;
}

/**
 * Validate alphanumeric string (letters, numbers, Vietnamese chars)
 */
export function isAlphanumericVietnamese(value: string): boolean {
  if (typeof value !== "string") return false;
  // Allow Vietnamese characters, letters, numbers, spaces, and common punctuation
  const regex = /^[\p{L}\p{N}\s\-_.]+$/u;
  return regex.test(value.trim());
}

// ============= ENUM/SELECT VALIDATION =============

/**
 * Validate value is in allowed list
 */
export function isOneOf<T>(
  value: unknown,
  allowedValues: readonly T[]
): value is T {
  return allowedValues.includes(value as T);
}

/**
 * Validate shift ID
 */
export function isValidShiftId(value: unknown): value is "1" | "2" | "3" {
  return isOneOf(value, ["1", "2", "3"] as const);
}

/**
 * Validate team
 */
export function isValidTeam(value: unknown): value is "A" | "B" | "C" | "D" {
  return isOneOf(value, ["A", "B", "C", "D"] as const);
}

/**
 * Validate container size
 */
export function isValidContainerSize(
  value: unknown
): value is "20" | "40" | "45" {
  return isOneOf(value, ["20", "40", "45"] as const);
}

// ============= FORM VALIDATION HELPERS =============

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate dashboard filter inputs
 */
export function validateDashboardFilters(filters: {
  startDate?: string;
  endDate?: string;
  shift?: string;
  team?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate date range if both dates provided
  if (filters.startDate && filters.endDate) {
    const dateValidation = isValidDateRange(
      filters.startDate,
      filters.endDate,
      365
    );
    if (!dateValidation.valid) {
      errors.dateRange = dateValidation.error || "Khoảng ngày không hợp lệ";
    }
  } else if (filters.startDate && !isValidDate(filters.startDate)) {
    errors.startDate = "Ngày bắt đầu không hợp lệ";
  } else if (filters.endDate && !isValidDate(filters.endDate)) {
    errors.endDate = "Ngày kết thúc không hợp lệ";
  }

  // Validate shift if provided
  if (filters.shift && !isValidShiftId(filters.shift)) {
    errors.shift = "Ca làm việc không hợp lệ";
  }

  // Validate team if provided
  if (filters.team && !isValidTeam(filters.team)) {
    errors.team = "Tổ không hợp lệ";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate report data entry
 */
export function validateReportEntry(entry: {
  container20?: number;
  container40?: number;
  container45?: number;
  vesselCount?: number;
  notes?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate container counts
  if (
    entry.container20 !== undefined &&
    !isNonNegativeNumber(entry.container20)
  ) {
    errors.container20 = "Số container 20 không hợp lệ";
  }
  if (
    entry.container40 !== undefined &&
    !isNonNegativeNumber(entry.container40)
  ) {
    errors.container40 = "Số container 40 không hợp lệ";
  }
  if (
    entry.container45 !== undefined &&
    !isNonNegativeNumber(entry.container45)
  ) {
    errors.container45 = "Số container 45 không hợp lệ";
  }

  // Validate vessel count
  if (
    entry.vesselCount !== undefined &&
    !isNonNegativeNumber(entry.vesselCount)
  ) {
    errors.vesselCount = "Số tàu không hợp lệ";
  }

  // Validate notes length
  if (entry.notes && !hasValidLength(entry.notes, 0, 1000)) {
    errors.notes = "Ghi chú không được vượt quá 1000 ký tự";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============= SANITIZATION =============

/**
 * Sanitize string input (trim, remove excessive whitespace)
 */
export function sanitizeString(value: string): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Sanitize number input (convert string to number, default to 0)
 */
export function sanitizeNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(value: unknown, defaultValue = 0): number {
  const num = sanitizeNumber(value, defaultValue);
  return Math.floor(num);
}

/**
 * Clamp number to range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
