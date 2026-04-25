/**
 * Common Types
 * Shared utility types and interfaces
 */

// Time range for filtering
export interface TimeRange {
  start: string;
  end: string;
}

// Date range for reports
export interface DateRange {
  from: string;
  to: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard data point
export interface DataPoint {
  label: string;
  value: number;
  category?: string;
}

// Statistics summary
export interface StatsSummary {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
}

// Operation result
export interface OperationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

// User/Auth types
export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department?: string;
}

// Notification
export interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Coordinate for 3D
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

// Color config
export interface ColorConfig {
  primary: string;
  secondary: string;
  accent: string;
}

// Export utility type
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
