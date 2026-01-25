"""Building configuration for floor-based bonus points."""

from typing import List, Optional
from pydantic import BaseModel


class Building(BaseModel):
    """Building with floor information."""
    
    id: str
    name: str
    latitude: float
    longitude: float
    floors: List[int]
    trigger_radius_meters: float = 50.0  # Show floor picker within this radius


# Concordia buildings with floor information
BUILDINGS_WITH_FLOORS = [
    Building(
        id="hall_building",
        name="Hall Building",
        latitude=45.497083,
        longitude=-73.578417,
        floors=[1, 2, 3, 4, 5, 6, 7, 8, 9],
        trigger_radius_meters=50.0
    ),
    Building(
        id="ev_building",
        name="EV Building",
        latitude=45.495556,
        longitude=-73.577778,
        floors=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        trigger_radius_meters=50.0
    ),
    Building(
        id="mb_building",
        name="MB Building (John Molson)",
        latitude=45.495278,
        longitude=-73.579167,
        floors=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        trigger_radius_meters=50.0
    ),
]


def get_building_by_id(building_id: str) -> Optional[Building]:
    """Get a building by its ID."""
    for building in BUILDINGS_WITH_FLOORS:
        if building.id == building_id:
            return building
    return None


def find_nearby_building(latitude: float, longitude: float) -> Optional[Building]:
    """Find if coordinates are within range of a building with floors.
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
    
    Returns:
        Building if within trigger radius, None otherwise
    """
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371000  # Earth's radius in meters
    
    for building in BUILDINGS_WITH_FLOORS:
        lat1_rad = radians(latitude)
        lat2_rad = radians(building.latitude)
        delta_lat = radians(building.latitude - latitude)
        delta_lon = radians(building.longitude - longitude)
        
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = R * c
        
        if distance <= building.trigger_radius_meters:
            return building
    
    return None
