/**
 * Berth Utility Functions
 * Common utility functions for berth operations
 */

import type {
  BerthSegment,
  BerthZone,
  BerthStatusType,
  BerthOccupancy,
} from "../berth";

/**
 * Calculate berth segment length
 */
export function getBerthLength(segment: BerthSegment): number {
  return segment.end_m - segment.start_m;
}

/**
 * Calculate total zone length
 */
export function getZoneLength(zone: BerthZone): number {
  return zone.segments.reduce((total, seg) => total + getBerthLength(seg), 0);
}

/**
 * Check if a position falls within a berth segment
 */
export function isPositionInSegment(
  position: number,
  segment: BerthSegment
): boolean {
  return position >= segment.start_m && position <= segment.end_m;
}

/**
 * Find segment at a given position
 */
export function findSegmentAtPosition(
  position: number,
  zone: BerthZone
): BerthSegment | undefined {
  return zone.segments.find((seg) => isPositionInSegment(position, seg));
}

/**
 * Get berth status display text (Vietnamese)
 */
export function getBerthStatusText(status: BerthStatusType): string {
  const statusMap: Record<BerthStatusType, string> = {
    available: "Trống",
    occupied: "Có tàu",
    reserved: "Đã đặt",
    maintenance: "Bảo trì",
  };
  return statusMap[status] || status;
}

/**
 * Get berth status color for UI
 */
export function getBerthStatusColor(status: BerthStatusType): string {
  const colorMap: Record<BerthStatusType, string> = {
    available: "#22c55e", // green
    occupied: "#ef4444", // red
    reserved: "#f59e0b", // amber
    maintenance: "#6b7280", // gray
  };
  return colorMap[status] || "#6b7280";
}

/**
 * Check if vessel draft is within berth limit
 */
export function isDraftWithinLimit(
  vesselDraft: number,
  berthDraftLimit: number,
  safetyMargin: number = 1.0
): boolean {
  return vesselDraft + safetyMargin <= berthDraftLimit;
}

/**
 * Calculate available space on berth segment
 */
export function calculateAvailableSpace(
  segment: BerthSegment,
  occupancies: BerthOccupancy[],
  vesselLengths: Record<string, number>
): number {
  const totalLength = getBerthLength(segment);

  // Filter active occupancies for this segment
  const activeOccupancies = occupancies.filter(
    (o) => o.berth_id === segment.id && o.status === "active"
  );

  // Sum occupied space
  const occupiedSpace = activeOccupancies.reduce((total, o) => {
    const vesselLength = vesselLengths[o.vessel_id] || 0;
    return total + vesselLength + 10; // Add safety buffer
  }, 0);

  return Math.max(0, totalLength - occupiedSpace);
}

/**
 * Get adjacent berth segments
 */
export function getAdjacentSegments(
  segment: BerthSegment,
  zone: BerthZone
): { before?: BerthSegment; after?: BerthSegment } {
  const sortedSegments = [...zone.segments].sort(
    (a, b) => a.start_m - b.start_m
  );
  const index = sortedSegments.findIndex((s) => s.id === segment.id);

  return {
    before: index > 0 ? sortedSegments[index - 1] : undefined,
    after:
      index < sortedSegments.length - 1 ? sortedSegments[index + 1] : undefined,
  };
}

/**
 * Convert berth position to coordinates (for 3D visualization)
 */
export function berthPositionToCoords(
  positionM: number,
  offsetX: number = 0,
  offsetZ: number = 0
): [number, number, number] {
  // Scale factor: 1 meter = 1 unit in 3D scene
  const x = positionM + offsetX;
  const y = 0;
  const z = offsetZ;
  return [x, y, z];
}

/**
 * Format berth position display
 */
export function formatBerthPosition(positionM: number): string {
  return `${positionM.toFixed(0)}m`;
}

/**
 * Validate berth segment configuration
 */
export function validateBerthSegment(segment: BerthSegment): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (segment.start_m < 0) errors.push("Vị trí bắt đầu không được âm");
  if (segment.end_m <= segment.start_m)
    errors.push("Vị trí kết thúc phải lớn hơn vị trí bắt đầu");
  if (segment.draft_limit <= 0) errors.push("Giới hạn mớn nước phải lớn hơn 0");
  if (segment.draft_limit > 20)
    errors.push("Giới hạn mớn nước không hợp lệ (> 20m)");

  return { valid: errors.length === 0, errors };
}
