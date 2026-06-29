"""location service: fetch random campus locations for game rounds."""

import uuid
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import make_transient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location
from app.schemas.location import LocationCreate

# In-memory cache: location_id (str) -> detached Location object.
# Location rows are read-only during a game, so a simple dict is safe.
# Invalidated on update/delete.
_location_cache: dict[str, Location] = {}


async def create_location(data: LocationCreate, db: AsyncSession) -> str:
    location = Location(**data.model_dump(exclude_none=True))
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return str(location.id)


async def get_location(location_id: str, db: AsyncSession) -> Optional[Location]:
    if location_id in _location_cache:
        return _location_cache[location_id]

    try:
        uid = uuid.UUID(location_id)
    except (ValueError, AttributeError):
        return None

    result = await db.execute(select(Location).where(Location.id == uid))
    location = result.scalar_one_or_none()

    if location:
        # Detach from session so it can be safely stored and reused across requests.
        db.expunge(location)
        make_transient(location)
        _location_cache[location_id] = location

    return location


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
    # Re-merge the detached object back into the session for the update.
    location = await db.merge(location)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(location, key, value)
    await db.commit()
    _location_cache.pop(location_id, None)
    return True


async def delete_location(location_id: str, db: AsyncSession) -> bool:
    location = await get_location(location_id, db)
    if not location:
        return False
    location = await db.merge(location)
    await db.delete(location)
    await db.commit()
    _location_cache.pop(location_id, None)
    return True


async def count_locations(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Location))
    return result.scalar_one()
