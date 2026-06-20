"""locations api: fetch, upload, and manage campus photo locations."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config_buildings import find_nearby_building
from app.dependencies import get_db
from app.schemas.location import LocationCreate, LocationResponse
from app.services import location_service
from app.services.s3_service import s3_service

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.post("", response_model=dict, status_code=201)
async def create_location(
    name: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    difficulty: str = Form("medium"),
    image: UploadFile = File(...),
    building_id: Optional[str] = Form(None),
    floor: Optional[int] = Form(None),
    university: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_content = await image.read()
    image_url = s3_service.upload_image(
        file_content=image_content,
        filename=image.filename,
        content_type=image.content_type,
    )
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image to S3")

    detected_building_id = building_id
    detected_floor = floor
    if not detected_building_id:
        nearby = find_nearby_building(latitude, longitude)
        if nearby:
            detected_building_id = nearby.id
            detected_floor = floor if floor is not None else 1
    if detected_building_id and detected_floor is None:
        detected_floor = 1

    location_data = LocationCreate(
        name=name,
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
        difficulty=difficulty,
        building_id=detected_building_id,
        floor=detected_floor,
        university=university,
    )
    location_id = await location_service.create_location(location_data, db)
    return {"id": location_id, "image_url": image_url, "message": "Location created successfully"}


@router.post("/with-url", response_model=dict, status_code=201)
async def create_location_with_url(
    location: LocationCreate,
    db: AsyncSession = Depends(get_db),
):
    location_id = await location_service.create_location(location, db)
    return {"id": location_id, "message": "Location created successfully"}


@router.get("", response_model=List[LocationResponse])
async def get_locations(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    locations = await location_service.get_all_locations(db, skip=skip, limit=limit)
    return [LocationResponse.model_validate(loc) for loc in locations]


@router.get("/count", response_model=dict)
async def count_locations(db: AsyncSession = Depends(get_db)):
    return {"count": await location_service.count_locations(db)}


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: str, db: AsyncSession = Depends(get_db)):
    loc = await location_service.get_location(location_id, db)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationResponse.model_validate(loc)


@router.put("/{location_id}", response_model=dict)
async def update_location(
    location_id: str,
    location: LocationCreate,
    db: AsyncSession = Depends(get_db),
):
    if not await location_service.update_location(location_id, location, db):
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location updated successfully"}


@router.delete("/{location_id}", response_model=dict)
async def delete_location(location_id: str, db: AsyncSession = Depends(get_db)):
    loc = await location_service.get_location(location_id, db)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    await location_service.delete_location(location_id, db)
    if loc.image_url.startswith(s3_service.base_url):
        s3_service.delete_image(loc.image_url)
    return {"message": "Location deleted successfully"}
