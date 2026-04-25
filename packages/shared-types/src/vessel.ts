/**
 * Vessel Types
 * Shared vessel data structures between apps
 */

export interface VesselBase {
  id: string;
  name: string;
  voyage?: string;
  loa: number; // Length Overall (meters)
  beam?: number; // Width (meters)
  draft?: number; // Draft (meters)
  flag?: string;
  shipping_line?: string;
}

export interface VesselPosition {
  vessel_id: string;
  berth_id: string;
  start_position: number; // meters from berth start
  end_position: number; // meters from berth start
}

export interface VesselMovement {
  vessel_id: string;
  type: "import" | "export" | "shift";
  container_count: number;
  teus?: number;
  timestamp: string;
}

export interface VesselOperationTime {
  vessel_id: string;
  atb?: string; // Arrival Time at Berth
  atw?: string; // Arrival Time Working
  atc?: string; // Arrival Time Complete
  atd?: string; // Arrival Time Departure
}

export interface VesselSchedule extends VesselBase {
  eta?: string; // Estimated Time of Arrival
  etd?: string; // Estimated Time of Departure
  berth_id?: string;
  status: "scheduled" | "berthing" | "working" | "completed" | "departed";
}

export type VesselStatus =
  | "approaching"
  | "berthing"
  | "working"
  | "idle"
  | "departing"
  | "departed";
