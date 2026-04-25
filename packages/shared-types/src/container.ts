/**
 * Container Types
 * Shared container yard data structures
 */

export interface ContainerBlock {
  id: string;
  name: string;
  zone: "A" | "B" | "C" | "D";
  rows: number;
  bays: number;
  tiers: number;
  capacity: number;
}

export interface ContainerPosition {
  block_id: string;
  bay: number;
  row: number;
  tier: number;
}

export interface Container {
  id: string;
  container_no: string;
  size: "20" | "40" | "45";
  type: "DC" | "HC" | "RF" | "OT" | "FR" | "TK";
  status: "full" | "empty";
  weight_kg?: number;
  position?: ContainerPosition;
  vessel_id?: string;
  booking_no?: string;
}

export interface YardInventory {
  date: string;
  block_id: string;
  import_count: number;
  export_count: number;
  empty_count: number;
  total_count: number;
  utilization_pct: number;
}

export interface ContainerMovement {
  id: string;
  container_id: string;
  movement_type: "receive" | "deliver" | "rehandle" | "shift";
  from_position?: ContainerPosition;
  to_position?: ContainerPosition;
  timestamp: string;
  equipment_id?: string;
}

export type ContainerSize = "20" | "40" | "45";
export type ContainerType = "DC" | "HC" | "RF" | "OT" | "FR" | "TK";
