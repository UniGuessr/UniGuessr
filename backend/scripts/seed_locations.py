"""seed concordia campus locations into the database."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete, func, select

from app.core.database import AsyncSessionLocal
from app.models.location import Location

SAMPLE_LOCATIONS = [
    # SGW Campus
    {"name": "Hall Building", "latitude": 45.497200, "longitude": -73.578900, "image_url": "/Pics/1712176459788.jpg", "difficulty": "easy", "university": "concordia"},
    {"name": "Henry F. Hall Building Entrance", "latitude": 45.497100, "longitude": -73.579200, "image_url": "/Pics/1712176459788.jpg", "difficulty": "easy", "university": "concordia"},
    {"name": "EV Building", "latitude": 45.495400, "longitude": -73.578000, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "John Molson Building", "latitude": 45.495100, "longitude": -73.579200, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "Visual Arts Building (VA)", "latitude": 45.494800, "longitude": -73.578400, "image_url": "/Pics/1712176459788.jpg", "difficulty": "hard", "university": "concordia"},
    {"name": "Grey Nuns Building (GN)", "latitude": 45.491600, "longitude": -73.577900, "image_url": "/Pics/1712176459788.jpg", "difficulty": "hard", "university": "concordia"},
    {"name": "Guy-De Maisonneuve Building (GM)", "latitude": 45.496900, "longitude": -73.578200, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "J.W. McConnell Building (LB)", "latitude": 45.497500, "longitude": -73.577800, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "Faubourg Building (FB)", "latitude": 45.495600, "longitude": -73.577300, "image_url": "/Pics/1712176459788.jpg", "difficulty": "hard", "university": "concordia"},
    {"name": "Engineering Computer Science and Visual Arts (EV)", "latitude": 45.495500, "longitude": -73.577900, "image_url": "/Pics/1712176459788.jpg", "difficulty": "easy", "university": "concordia"},
    {"name": "Webster Library", "latitude": 45.497000, "longitude": -73.578500, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "Guy-Concordia Metro Station Entrance", "latitude": 45.496600, "longitude": -73.577500, "image_url": "/Pics/1712176459788.jpg", "difficulty": "easy", "university": "concordia"},
    # Loyola Campus
    {"name": "Central Building (Loyola)", "latitude": 45.458400, "longitude": -73.640200, "image_url": "/Pics/1712176459788.jpg", "difficulty": "easy", "university": "concordia"},
    {"name": "Student Centre (Loyola)", "latitude": 45.458100, "longitude": -73.640600, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "Richard J. Renaud Science Complex (Loyola)", "latitude": 45.457800, "longitude": -73.639800, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "Vanier Library (Loyola)", "latitude": 45.458300, "longitude": -73.640100, "image_url": "/Pics/1712176459788.jpg", "difficulty": "easy", "university": "concordia"},
    {"name": "Stinger Dome (Loyola)", "latitude": 45.457200, "longitude": -73.641100, "image_url": "/Pics/1712176459788.jpg", "difficulty": "hard", "university": "concordia"},
    {"name": "Psychology Building (Loyola)", "latitude": 45.458600, "longitude": -73.640400, "image_url": "/Pics/1712176459788.jpg", "difficulty": "hard", "university": "concordia"},
    {"name": "Communication Studies Building (Loyola)", "latitude": 45.458200, "longitude": -73.639600, "image_url": "/Pics/1712176459788.jpg", "difficulty": "medium", "university": "concordia"},
    {"name": "Concordia Greenhouse (Loyola)", "latitude": 45.457900, "longitude": -73.640800, "image_url": "/Pics/1712176459788.jpg", "difficulty": "hard", "university": "concordia"},
]


async def seed_database(clear_existing: bool = False):
    async with AsyncSessionLocal() as session:
        existing = (await session.execute(select(func.count()).select_from(Location))).scalar()
        print(f"found {existing} existing locations")

        if existing > 0 and not clear_existing:
            response = input("add anyway? (y/N): ").strip().lower()
            if response != "y":
                print("cancelled")
                return

        if clear_existing and existing > 0:
            await session.execute(delete(Location))
            await session.commit()
            print(f"cleared {existing} existing locations")

        locations = [Location(**loc) for loc in SAMPLE_LOCATIONS]
        session.add_all(locations)
        await session.commit()
        print(f"inserted {len(locations)} locations")


def main():
    clear_existing = "--clear" in sys.argv or "-c" in sys.argv
    if clear_existing:
        print("clear mode: deleting all existing locations first")
    asyncio.run(seed_database(clear_existing))


if __name__ == "__main__":
    main()
