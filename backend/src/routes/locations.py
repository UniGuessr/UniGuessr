from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.database import get_db
from src.models.location import LocationCreate, LocationResponse
from src.services.location_service import LocationService
from src.services.s3_service import s3_service
from src.config_buildings import find_nearby_building

router = APIRouter(prefix="/api/locations", tags=["locations"])


def get_location_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> LocationService:
    """Dependency to get location service."""
    return LocationService(db)


@router.post("", response_model=dict, status_code=201)
async def create_location(
    name: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    difficulty: str = Form("medium"),
    image: UploadFile = File(...),
    building_id: Optional[str] = Form(None),
    floor: Optional[int] = Form(None),
    service: LocationService = Depends(get_location_service)
):
    """
    Create a new location with image upload to S3.
    
    Args:
        name: Name of the location
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        difficulty: Difficulty level (easy, medium, hard)
        image: Image file to upload
        building_id: Optional building ID (auto-detected if within radius)
        floor: Optional floor number (defaults to 1 if building_id is set)
        service: Location service dependency
    
    Returns:
        Created location ID and message
    """
    # Validate image file type
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read image content
    image_content = await image.read()
    
    # Upload to S3
    image_url = s3_service.upload_image(
        file_content=image_content,
        filename=image.filename,
        content_type=image.content_type
    )
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image to S3")
    
    # Auto-detect building if not provided and within radius
    detected_building_id = building_id
    detected_floor = floor
    
    if not detected_building_id:
        nearby_building = find_nearby_building(latitude, longitude)
        if nearby_building:
            detected_building_id = nearby_building.id
            # Default floor to 1 if not provided
            detected_floor = floor if floor is not None else 1
    
    # If building_id is set but no floor, default to 1
    if detected_building_id and detected_floor is None:
        detected_floor = 1
    
    # Create location with S3 URL
    location_data = LocationCreate(
        name=name,
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
        difficulty=difficulty,
        building_id=detected_building_id,
        floor=detected_floor
    )
    
    location_id = await service.create_location(location_data)
    return {
        "id": location_id,
        "image_url": image_url,
        "message": "Location created successfully"
    }


@router.post("/with-url", response_model=dict, status_code=201)
async def create_location_with_url(
    location: LocationCreate,
    service: LocationService = Depends(get_location_service)
):
    """
    Create a new location with a pre-existing image URL (for migrations/scripts).
    
    Args:
        location: Location data with image_url already set
        service: Location service dependency
    
    Returns:
        Created location ID and message
    """
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
    """Delete a location and its image from S3."""
    # Get location to retrieve image URL
    location = await service.get_location(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Delete from database
    success = await service.delete_location(location_id)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Delete image from S3 if it's an S3 URL
    if location.image_url.startswith(s3_service.base_url):
        s3_service.delete_image(location.image_url)
    
    return {"message": "Location deleted successfully"}
