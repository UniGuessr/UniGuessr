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
  /** Real building footprint as a closed ring of [lng, lat] points (from OSM). */
  footprint: [number, number][];
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
    footprint: [
      [-73.578824, 45.496826],
      [-73.578625, 45.497037],
      [-73.578409, 45.497255],
      [-73.578294, 45.497371],
      [-73.578399, 45.497423],
      [-73.578579, 45.49751],
      [-73.579008, 45.497716],
      [-73.579012, 45.497713],
      [-73.579269, 45.497447],
      [-73.579538, 45.497174],
      [-73.579543, 45.497167],
      [-73.579459, 45.497128],
      [-73.578824, 45.496826],
    ],
  },
  {
    id: "ev_building",
    name: "EV Building",
    latitude: 45.495556,
    longitude: -73.577778,
    floors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    triggerRadiusMeters: 50,
    footprint: [
      [-73.578441, 45.495933],
      [-73.578334, 45.495884],
      [-73.578313, 45.495903],
      [-73.578005, 45.495753],
      [-73.577711, 45.496064],
      [-73.577478, 45.495952],
      [-73.577232, 45.495836],
      [-73.577538, 45.495513],
      [-73.577612, 45.49555],
      [-73.577695, 45.49559],
      [-73.577756, 45.495526],
      [-73.577731, 45.495515],
      [-73.577742, 45.495502],
      [-73.577615, 45.495437],
      [-73.577832, 45.495222],
      [-73.577868, 45.495186],
      [-73.578024, 45.495254],
      [-73.578036, 45.495245],
      [-73.578385, 45.495407],
      [-73.578684, 45.495553],
      [-73.578675, 45.495564],
      [-73.578666, 45.495573],
      [-73.578654, 45.495588],
      [-73.578704, 45.495609],
      [-73.578729, 45.495627],
      [-73.578441, 45.495933],
    ],
  },
  {
    id: "mb_building",
    name: "MB Building (John Molson)",
    latitude: 45.495278,
    longitude: -73.579167,
    floors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    triggerRadiusMeters: 50,
    footprint: [
      [-73.578795, 45.494948],
      [-73.579226, 45.495187],
      [-73.579306, 45.495118],
      [-73.579372, 45.495157],
      [-73.579541, 45.495258],
      [-73.579567, 45.495274],
      [-73.579409, 45.495405],
      [-73.579408, 45.495406],
      [-73.579399, 45.495413],
      [-73.579229, 45.49554],
      [-73.579193, 45.495525],
      [-73.579086, 45.495479],
      [-73.57908, 45.495487],
      [-73.578915, 45.495418],
      [-73.578855, 45.495377],
      [-73.578512, 45.495225],
      [-73.578464, 45.495204],
      [-73.578502, 45.495169],
      [-73.578723, 45.495006],
      [-73.578795, 45.494948],
    ],
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
