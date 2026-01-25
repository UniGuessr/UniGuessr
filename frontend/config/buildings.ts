/**
 * Building configuration for floor-based bonus points
 */

export interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  floors: number[];
  triggerRadiusMeters: number;
}

// Concordia buildings with floor information
export const BUILDINGS_WITH_FLOORS: Building[] = [
  {
    id: "hall_building",
    name: "Hall Building",
    latitude: 45.497083,
    longitude: -73.578417,
    floors: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    triggerRadiusMeters: 50,
  },
  {
    id: "ev_building",
    name: "EV Building",
    latitude: 45.495556,
    longitude: -73.577778,
    floors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    triggerRadiusMeters: 50,
  },
  {
    id: "mb_building",
    name: "MB Building (John Molson)",
    latitude: 45.495278,
    longitude: -73.579167,
    floors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    triggerRadiusMeters: 50,
  },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find if coordinates are within range of a building with floors
 */
export function findNearbyBuilding(
  latitude: number,
  longitude: number
): Building | null {
  for (const building of BUILDINGS_WITH_FLOORS) {
    const distance = calculateDistance(
      latitude,
      longitude,
      building.latitude,
      building.longitude
    );

    if (distance <= building.triggerRadiusMeters) {
      return building;
    }
  }

  return null;
}

/**
 * Get building by ID
 */
export function getBuildingById(buildingId: string): Building | undefined {
  return BUILDINGS_WITH_FLOORS.find((b) => b.id === buildingId);
}
