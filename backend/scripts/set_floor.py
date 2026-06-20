"""set floor to 1 on all locations that are missing a floor value."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import update

from app.core.database import AsyncSessionLocal
from app.models.location import Location


async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(Location).where(Location.floor.is_(None)).values(floor=1)
        )
        await session.commit()
        print(f"updated {result.rowcount} locations with floor=1")


if __name__ == "__main__":
    asyncio.run(main())
