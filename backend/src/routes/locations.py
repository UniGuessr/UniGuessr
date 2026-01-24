from typing import List
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.database import get_db
from src.models.location import LocationCreate, LocationResponse
from src.services.location_service import LocationService

router = APIRouter(prefix="/api/locations", tags=["locations"])


def get_location_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> LocationService:
    """Dependency to get location service."""
    return LocationService(db)


@router.post("", response_model=dict, status_code=201)
async def create_location(
    location: LocationCreate,
    service: LocationService = Depends(get_location_service)
):
    """Create a new location."""
    location_id = await service.create_location(location)
    return {"id": location_id, "message": "Location created successfully"}


@router.get("", response_model=List[LocationResponse])
async def get_locations(
    skip: int = 0,
    limit: int = 100,
    service: LocationService = Depends(get_location_service)
):
    """Get all locations with pagination."""
    locations = await service.get_all_locations(skip=skip, limit=limit)
    return [LocationResponse(**loc.model_dump()) for loc in locations]


@router.get("/count", response_model=dict)
async def count_locations(
    service: LocationService = Depends(get_location_service)
):
    """Get total count of locations."""
    count = await service.count_locations()
    return {"count": count}


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: str,
    service: LocationService = Depends(get_location_service)
):
    """Get a specific location by ID."""
    location = await service.get_location(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationResponse(**location.model_dump())


@router.put("/{location_id}", response_model=dict)
async def update_location(
    location_id: str,
    location: LocationCreate,
    service: LocationService = Depends(get_location_service)
):
    """Update a location."""
    success = await service.update_location(location_id, location)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location updated successfully"}


@router.delete("/{location_id}", response_model=dict)
async def delete_location(
    location_id: str,
    service: LocationService = Depends(get_location_service)
):
    """Delete a location."""
    success = await service.delete_location(location_id)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted successfully"}
