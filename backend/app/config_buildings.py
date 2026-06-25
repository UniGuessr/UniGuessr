"""building config: coordinates and floor counts for on-campus buildings."""

from math import atan2, cos, radians, sin, sqrt
from typing import List, Optional

from pydantic import BaseModel


class Building(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    floors: List[int]
    trigger_radius_meters: float = 50.0


BUILDINGS_WITH_FLOORS = [
    Building(
        id="hall_building",
        name="Hall Building",
        latitude=45.497083,
        longitude=-73.578417,
        floors=[1, 2, 3, 4, 5, 6, 7, 8, 9],
    ),
    Building(
        id="ev_building",
        name="EV Building",
        latitude=45.495556,
        longitude=-73.577778,
        floors=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    ),
    Building(
        id="mb_building",
        name="MB Building (John Molson)",
        latitude=45.495278,
        longitude=-73.579167,
        floors=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    ),
]


def get_building_by_id(building_id: str) -> Optional[Building]:
    for b in BUILDINGS_WITH_FLOORS:
        if b.id == building_id:
            return b
    return None


def find_nearby_building(latitude: float, longitude: float) -> Optional[Building]:
    R = 6371000
    for b in BUILDINGS_WITH_FLOORS:
        lat1_r, lat2_r = radians(latitude), radians(b.latitude)
        d_lat, d_lon = radians(b.latitude - latitude), radians(b.longitude - longitude)
        a = sin(d_lat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(d_lon / 2) ** 2
        dist = R * 2 * atan2(sqrt(a), sqrt(1 - a))
        if dist <= b.trigger_radius_meters:
            return b
    return None
