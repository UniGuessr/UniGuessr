"""university service: list, create, and validate canonical school names."""

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.university import University


def slugify(value: str) -> str:
    """lowercase, keep alnum + hyphen, collapse other runs to single hyphen."""
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


async def list_universities(db: AsyncSession) -> list[University]:
    result = await db.execute(select(University).order_by(University.name))
    return list(result.scalars().all())


async def get_by_name(name: str, db: AsyncSession) -> University | None:
    result = await db.execute(select(University).where(University.name == name))
    return result.scalar_one_or_none()


async def create_university(name: str, db: AsyncSession) -> University:
    university = University(name=name, slug=slugify(name))
    db.add(university)
    await db.commit()
    await db.refresh(university)
    return university
