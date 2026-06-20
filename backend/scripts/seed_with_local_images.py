"""upload local images to s3 and seed corresponding locations into the database."""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete, func, select

from app.core.database import AsyncSessionLocal
from app.models.location import Location
from app.services.s3_service import s3_service

# Map image files to locations — edit to match your actual images and coordinates.
LOCATION_DATA = [
    {"name": "Hall Building", "latitude": 45.497200, "longitude": -73.578900, "difficulty": "easy", "university": "concordia", "image_file": "sample_1.jpg"},
    {"name": "EV Building", "latitude": 45.495400, "longitude": -73.578000, "difficulty": "medium", "university": "concordia", "image_file": "sample_2.jpg"},
    {"name": "John Molson Building", "latitude": 45.495100, "longitude": -73.579200, "difficulty": "medium", "university": "concordia", "image_file": "sample_3.jpeg"},
    {"name": "Visual Arts Building", "latitude": 45.494800, "longitude": -73.578400, "difficulty": "hard", "university": "concordia", "image_file": "sample_4.jpeg"},
    {"name": "Central Building (Loyola)", "latitude": 45.458400, "longitude": -73.640200, "difficulty": "easy", "university": "concordia", "image_file": "sample_5.jpeg"},
]


async def seed_with_images():
    print("testing s3 connection...")
    if not s3_service.test_connection():
        print("s3 connection failed — check aws credentials in .secrets.{APP_ENV}")
        return False
    print("s3 ok")

    pics_dir = Path(__file__).parent.parent / "Pics"
    if not pics_dir.exists():
        print(f"pics directory not found: {pics_dir}")
        return False

    async with AsyncSessionLocal() as session:
        existing = (await session.execute(select(func.count()).select_from(Location))).scalar()
        if existing > 0:
            response = input(f"{existing} locations exist. clear and reseed? (y/N): ")
            if response.lower() != "y":
                print("cancelled")
                return False
            await session.execute(delete(Location))
            await session.commit()
            print("cleared existing locations")

        created = 0
        for loc_data in LOCATION_DATA:
            image_file = pics_dir / loc_data["image_file"]
            if not image_file.exists():
                print(f"image not found: {image_file.name}, skipping")
                continue

            print(f"uploading {loc_data['name']}...")
            with open(image_file, "rb") as f:
                content = f.read()

            content_type = "image/jpeg" if image_file.suffix.lower() in (".jpg", ".jpeg") else "image/png"
            image_url = s3_service.upload_image(file_content=content, filename=image_file.name, content_type=content_type)

            if not image_url:
                print(f"  failed to upload {image_file.name}")
                continue

            print(f"  uploaded: {image_url}")
            session.add(Location(
                name=loc_data["name"],
                latitude=loc_data["latitude"],
                longitude=loc_data["longitude"],
                image_url=image_url,
                difficulty=loc_data.get("difficulty"),
                university=loc_data.get("university"),
            ))
            created += 1

        await session.commit()
        print(f"created {created} locations")
        return True


def main():
    result = asyncio.run(seed_with_images())
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
