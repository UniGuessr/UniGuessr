import uuid
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location
from app.schemas.location import LocationCreate


async def create_location(data: LocationCreate, db: AsyncSession) -> str:
    location = Location(**data.model_dump(exclude_none=True))
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return str(location.id)


async def get_location(location_id: str, db: AsyncSession) -> Optional[Location]:
    try:
        uid = uuid.UUID(location_id)
    except (ValueError, AttributeError):
        return None
    result = await db.execute(select(Location).where(Location.id == uid))
    return result.scalar_one_or_none()


async def get_all_locations(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Location]:
    result = await db.execute(select(Location).offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_random_locations(
    count: int, db: AsyncSession, university: Optional[str] = None
) -> list[Location]:
    query = select(Location).order_by(func.random()).limit(count)
    if university:
        query = query.where(
            or_(Location.university == university, Location.university.is_(None))
        )
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_location(location_id: str, data: LocationCreate, db: AsyncSession) -> bool:
    location = await get_location(location_id, db)
    if not location:
        return False
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(location, key, value)
    await db.commit()
    return True


async def delete_location(location_id: str, db: AsyncSession) -> bool:
    location = await get_location(location_id, db)
    if not location:
        return False
    await db.delete(location)
    await db.commit()
    return True


async def count_locations(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Location))
    return result.scalar_one()
