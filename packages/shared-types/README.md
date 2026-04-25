# @tanthuan/shared-types

Shared TypeScript types and interfaces for the Tan Thuan Port project.

## Installation

```bash
npm install @tanthuan/shared-types
```

## Usage

```typescript
import { VesselBase, BerthSegment, Container } from "@tanthuan/shared-types";

const vessel: VesselBase = {
  id: "V001",
  name: "EVER GIVEN",
  loa: 400,
  beam: 59,
  draft: 14.5,
};
```

## Available Types

### Vessel Types

- `VesselBase` - Basic vessel information
- `VesselPosition` - Vessel position at berth
- `VesselMovement` - Container movements for a vessel
- `VesselOperationTime` - ATB, ATW, ATC, ATD times
- `VesselSchedule` - Full vessel schedule data
- `VesselStatus` - Status enum

### Berth Types

- `BerthSegment` - Single berth segment
- `BerthZone` - Zone containing multiple segments
- `BerthSystem` - Full berth system
- `BerthOccupancy` - Berth occupancy record
- `QCCranePosition` - Quay crane position

### Container Types

- `ContainerBlock` - Yard block definition
- `ContainerPosition` - Bay/Row/Tier position
- `Container` - Container information
- `YardInventory` - Yard inventory by date
- `ContainerMovement` - Container movement record

### Common Types

- `TimeRange`, `DateRange` - Time filtering
- `PaginationParams`, `PaginatedResult` - Pagination
- `ApiResponse` - Standard API response
- `OperationResult` - Operation status with errors/warnings
- `Position3D` - 3D coordinates

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Clean build
npm run clean
```
