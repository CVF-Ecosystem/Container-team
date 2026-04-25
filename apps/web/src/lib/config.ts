/**
 * Application Configuration
 * Centralized configuration values for the web application
 * Environment variables take precedence over defaults
 */

// ============= ENVIRONMENT =============

export const ENV = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const;

// ============= API CONFIG =============

export const API_CONFIG = {
  // Base URLs
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",

  // Timeouts (ms)
  requestTimeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
  retryAttempts: Number(process.env.NEXT_PUBLIC_API_RETRY) || 3,
  retryDelay: 1000,

  // Sync settings
  syncInterval: Number(process.env.NEXT_PUBLIC_SYNC_INTERVAL) || 5 * 60 * 1000, // 5 minutes
  maxPendingChanges: 100,
} as const;

// ============= AUTH CONFIG =============

export const AUTH_CONFIG = {
  // Session
  sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  sessionExtendThreshold: 12 * 60 * 60 * 1000, // 12 hours

  // Rate limiting
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes

  // Password requirements
  minPasswordLength: 6,
  requireUppercase: false,
  requireNumber: false,
  requireSpecialChar: false,

  // Storage keys prefix
  storagePrefix: "tanthuan_auth_",
} as const;

// ============= UI CONFIG =============

export const UI_CONFIG = {
  // Pagination
  defaultPageSize: 20,
  maxPageSize: 100,

  // Toast notifications
  toastDuration: 5000,

  // Loading states
  skeletonCount: 5,
  loadingDelay: 200, // Show loading after this delay

  // Date/Time formats
  dateFormat: "dd/MM/yyyy",
  timeFormat: "HH:mm",
  dateTimeFormat: "dd/MM/yyyy HH:mm",

  // Locale
  locale: "vi-VN",
  timezone: "Asia/Ho_Chi_Minh",
} as const;

// ============= SHIFT CONFIG =============

export const SHIFT_CONFIG = {
  // Shift times
  shifts: [
    { id: "1", name: "Ca 1", start: "06:00", end: "14:00" },
    { id: "2", name: "Ca 2", start: "14:00", end: "22:00" },
    { id: "3", name: "Ca 3", start: "22:00", end: "06:00" },
  ],

  // Overtime
  defaultOvertimeHours: 0,
  maxOvertimeHours: 4,

  // Teams
  teams: ["A", "B", "C", "D"],
} as const;

// ============= WAREHOUSE CONFIG =============

export const WAREHOUSE_CONFIG = {
  // Yard areas
  areas: ["TT1", "TT2", "TT3"],

  // Container sizes
  containerSizes: ["20", "40", "45"] as const,

  // Default cargo types
  cargoTypes: ["CONTAINER", "STEEL", "GENERAL", "BULK", "REEFER"] as const,

  // Capacity thresholds (%)
  lowCapacityThreshold: 30,
  highCapacityThreshold: 80,
  criticalCapacityThreshold: 95,
} as const;

// ============= REPORT CONFIG =============

export const REPORT_CONFIG = {
  // Export formats
  supportedFormats: ["xlsx", "csv", "pdf"] as const,
  defaultFormat: "xlsx" as const,

  // Date range
  maxDateRangeDays: 365,
  defaultDateRangeDays: 30,

  // File size limits (bytes)
  maxExportSize: 50 * 1024 * 1024, // 50MB
} as const;

// ============= CACHE CONFIG =============

export const CACHE_CONFIG = {
  // IndexedDB
  dbName: "tanthuan_port_db",
  dbVersion: 1,

  // Cache durations (ms)
  shortTTL: 5 * 60 * 1000, // 5 minutes
  mediumTTL: 30 * 60 * 1000, // 30 minutes
  longTTL: 24 * 60 * 60 * 1000, // 24 hours

  // Max cache size
  maxCacheEntries: 1000,
} as const;

// ============= FEATURE FLAGS =============

export const FEATURE_FLAGS = {
  enableOfflineMode: true,
  enablePushNotifications: false,
  enableDarkMode: true,
  enableExcelImport: true,
  enableAdvancedFilters: true,
  enableDemoData: ENV.isDevelopment,
} as const;

// ============= TYPE EXPORTS =============

export type ShiftId = (typeof SHIFT_CONFIG.shifts)[number]["id"];
export type Team = (typeof SHIFT_CONFIG.teams)[number];
export type ContainerSize = (typeof WAREHOUSE_CONFIG.containerSizes)[number];
export type CargoType = (typeof WAREHOUSE_CONFIG.cargoTypes)[number];
export type ExportFormat = (typeof REPORT_CONFIG.supportedFormats)[number];
