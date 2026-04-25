/**
 * Vessel Utility Functions
 * Common utility functions for vessel operations
 */

import type {
  VesselBase,
  VesselStatus,
  VesselSchedule,
  VesselOperationTime,
} from "../vessel";

/**
 * Calculate vessel occupancy length (includes safety buffer)
 * @param loa - Length Overall in meters
 * @param safetyBuffer - Safety buffer on each side (default: 5m)
 */
export function calculateVesselOccupancy(
  loa: number,
  safetyBuffer: number = 5
): number {
  return loa + safetyBuffer * 2;
}

/**
 * Check if vessel fits in available berth space
 * @param vesselLoa - Vessel Length Overall
 * @param availableSpace - Available berth space in meters
 * @param safetyBuffer - Safety buffer (default: 5m)
 */
export function vesselFitsInSpace(
  vesselLoa: number,
  availableSpace: number,
  safetyBuffer: number = 5
): boolean {
  return calculateVesselOccupancy(vesselLoa, safetyBuffer) <= availableSpace;
}

/**
 * Get vessel status display text (Vietnamese)
 */
export function getVesselStatusText(status: VesselStatus): string {
  const statusMap: Record<VesselStatus, string> = {
    approaching: "Đang đến",
    berthing: "Đang cập bến",
    working: "Đang làm hàng",
    idle: "Chờ",
    departing: "Đang rời bến",
    departed: "Đã rời",
  };
  return statusMap[status] || status;
}

/**
 * Get vessel status color for UI
 */
export function getVesselStatusColor(status: VesselStatus): string {
  const colorMap: Record<VesselStatus, string> = {
    approaching: "#3b82f6", // blue
    berthing: "#f59e0b", // amber
    working: "#22c55e", // green
    idle: "#6b7280", // gray
    departing: "#f59e0b", // amber
    departed: "#9ca3af", // light gray
  };
  return colorMap[status] || "#6b7280";
}

/**
 * Calculate vessel turnaround time in hours
 */
export function calculateTurnaroundTime(
  operationTime: VesselOperationTime
): number | null {
  if (!operationTime.atb || !operationTime.atd) return null;

  const atb = new Date(operationTime.atb);
  const atd = new Date(operationTime.atd);
  const diff = atd.getTime() - atb.getTime();

  return diff / (1000 * 60 * 60); // Convert to hours
}

/**
 * Calculate vessel working time in hours
 */
export function calculateWorkingTime(
  operationTime: VesselOperationTime
): number | null {
  if (!operationTime.atw || !operationTime.atc) return null;

  const atw = new Date(operationTime.atw);
  const atc = new Date(operationTime.atc);
  const diff = atc.getTime() - atw.getTime();

  return diff / (1000 * 60 * 60); // Convert to hours
}

/**
 * Format vessel name with voyage
 */
export function formatVesselName(vessel: VesselBase): string {
  return vessel.voyage ? `${vessel.name} - ${vessel.voyage}` : vessel.name;
}

/**
 * Parse vessel IMO number from various formats
 */
export function parseImoNumber(imo: string): string | null {
  const cleaned = imo.replace(/[^0-9]/g, "");
  if (cleaned.length === 7) {
    return cleaned;
  }
  return null;
}

/**
 * Validate vessel dimensions
 */
export function validateVesselDimensions(vessel: VesselBase): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (vessel.loa <= 0) errors.push("LOA phải lớn hơn 0");
  if (vessel.loa > 400) errors.push("LOA không hợp lệ (> 400m)");
  if (vessel.beam && vessel.beam <= 0) errors.push("Chiều rộng phải lớn hơn 0");
  if (vessel.beam && vessel.beam > 60)
    errors.push("Chiều rộng không hợp lệ (> 60m)");
  if (vessel.draft && vessel.draft <= 0) errors.push("Mớn nước phải lớn hơn 0");
  if (vessel.draft && vessel.draft > 25)
    errors.push("Mớn nước không hợp lệ (> 25m)");

  return { valid: errors.length === 0, errors };
}

/**
 * Sort vessels by scheduled arrival time
 */
export function sortVesselsByEta(vessels: VesselSchedule[]): VesselSchedule[] {
  return [...vessels].sort((a, b) => {
    if (!a.eta) return 1;
    if (!b.eta) return -1;
    return new Date(a.eta).getTime() - new Date(b.eta).getTime();
  });
}

/**
 * Filter vessels by status
 */
export function filterVesselsByStatus(
  vessels: VesselSchedule[],
  statuses: VesselSchedule["status"][]
): VesselSchedule[] {
  return vessels.filter((v) => statuses.includes(v.status));
}
