"""universities api: list and create canonical school tags."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.university import UniversityCreate, UniversityResponse
from app.services import university_service

router = APIRouter(prefix="/api/universities", tags=["universities"])


@router.get("", response_model=List[UniversityResponse])
async def get_universities(db: AsyncSession = Depends(get_db)):
    return await university_service.list_universities(db)


@router.post("", response_model=UniversityResponse, status_code=201)
async def create_university(payload: UniversityCreate, db: AsyncSession = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="University name cannot be empty")
    if await university_service.get_by_name(name, db):
        raise HTTPException(status_code=409, detail="University already exists")
    return await university_service.create_university(name, db)
