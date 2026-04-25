/**
 * Date/Time Utility Functions
 * Common date and time utilities for port operations
 */

/**
 * Format date to Vietnamese locale
 */
export function formatDateVN(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format time to HH:MM
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format datetime to Vietnamese locale
 */
export function formatDateTimeVN(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Get relative time text (Vietnamese)
 */
export function getRelativeTimeVN(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 0) {
    // Future
    const futureMins = Math.abs(diffMins);
    if (futureMins < 60) return `${futureMins} phút nữa`;
    const futureHours = Math.abs(diffHours);
    if (futureHours < 24) return `${futureHours} giờ nữa`;
    return `${Math.abs(diffDays)} ngày nữa`;
  }

  // Past
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return formatDateVN(d);
}

/**
 * Calculate duration in hours between two dates
 */
export function calculateDurationHours(
  start: Date | string,
  end: Date | string
): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return (e.getTime() - s.getTime()) / (1000 * 60 * 60);
}

/**
 * Format duration in hours to readable string
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} phút`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} giờ`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days} ngày`;
  }
  return `${days} ngày ${remainingHours.toFixed(0)} giờ`;
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add hours to date
 */
export function addHours(date: Date | string, hours: number): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = typeof start1 === "string" ? new Date(start1) : start1;
  const e1 = typeof end1 === "string" ? new Date(end1) : end1;
  const s2 = typeof start2 === "string" ? new Date(start2) : start2;
  const e2 = typeof end2 === "string" ? new Date(end2) : end2;

  return s1 < e2 && s2 < e1;
}
