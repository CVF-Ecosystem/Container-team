/**
 * Logger Utility
 * Centralized logging with environment-aware behavior
 *
 * Usage:
 * import { logger } from '@/lib/logger';
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to save', error);
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

// Environment check
const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";
const logConsole = globalThis.console;

// Log levels that should be shown in production
const PRODUCTION_LOG_LEVELS: LogLevel[] = ["warn", "error"];

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const { level, message, timestamp } = entry;
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return `${prefix} ${message}`;
}

/**
 * Determine if log should be output
 */
function shouldLog(level: LogLevel): boolean {
  // Always suppress logs in test environment unless explicitly enabled
  if (isTest) return false;

  // In development, log everything
  if (isDevelopment) return true;

  // In production, only log warnings and errors
  return PRODUCTION_LOG_LEVELS.includes(level);
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };

  const formattedMessage = formatLogEntry(entry);

  switch (level) {
    case "debug":
      logConsole.debug(formattedMessage, data ?? "");
      break;
    case "info":
      logConsole.info(formattedMessage, data ?? "");
      break;
    case "warn":
      logConsole.warn(formattedMessage, data ?? "");
      break;
    case "error":
      logConsole.error(formattedMessage, data ?? "");
      break;
  }

  // In production, you might want to send errors to a monitoring service
  // if (level === 'error' && !isDevelopment) {
  //   sendToErrorTracking(entry);
  // }
}

/**
 * Logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - only shown in development
   * Use for detailed debugging information
   */
  debug: (message: string, data?: unknown): void => {
    log("debug", message, data);
  },

  /**
   * Info level - only shown in development
   * Use for general information about application flow
   */
  info: (message: string, data?: unknown): void => {
    log("info", message, data);
  },

  /**
   * Warning level - shown in all environments
   * Use for non-critical issues that should be addressed
   */
  warn: (message: string, data?: unknown): void => {
    log("warn", message, data);
  },

  /**
   * Error level - shown in all environments
   * Use for errors that need attention
   */
  error: (message: string, data?: unknown): void => {
    log("error", message, data);
  },

  /**
   * Log a group of related messages (development only)
   */
  group: (label: string, fn: () => void): void => {
    if (!isDevelopment) return;
    logConsole.group(label);
    fn();
    logConsole.groupEnd();
  },

  /**
   * Log a table (development only)
   */
  table: (data: unknown): void => {
    if (!isDevelopment) return;
    logConsole.table(data);
  },

  /**
   * Time a function execution (development only)
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (!isDevelopment) return fn();

    logConsole.time(label);
    try {
      return await fn();
    } finally {
      logConsole.timeEnd(label);
    }
  },
};

export default logger;
