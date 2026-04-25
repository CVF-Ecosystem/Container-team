/**
 * Berth Types
 * Shared berth/quay data structures
 */

export interface BerthSegment {
  id: string;
  name: string;
  zone_id: string;
  start_m: number; // Start position in meters
  end_m: number; // End position in meters
  draft_limit: number; // Maximum draft in meters
  is_standalone?: boolean;
}

export interface BerthZone {
  id: string;
  name: string;
  segments: BerthSegment[];
}

export interface BerthSystem {
  zones: BerthZone[];
  total_length: number;
}

export interface BerthOccupancy {
  berth_id: string;
  vessel_id: string;
  start_time: string;
  end_time?: string;
  status: "active" | "planned" | "completed";
}

export interface QCCranePosition {
  crane_id: string;
  position_m: number; // Position along the berth in meters
  status: "idle" | "working" | "moving";
}

export type BerthStatusType =
  | "available"
  | "occupied"
  | "reserved"
  | "maintenance";
