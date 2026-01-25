"""
Seed script to upload local images to S3 and create locations in DB.

Usage:
    cd backend
    uv run scripts/seed_with_local_images.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings
from src.services.s3_service import s3_service


# Map image files to locations (update with your actual data)
LOCATION_DATA = [
    {
        "name": "Hall Building",
        "latitude": 45.497200,
        "longitude": -73.578900,
        "difficulty": "easy",
        "image_file": "sample_1.jpg"  # File from Pics folder
    },
    {
        "name": "EV Building",
        "latitude": 45.495400,
        "longitude": -73.578000,
        "difficulty": "medium",
        "image_file": "sample_2.jpg"
    },
    {
        "name": "John Molson Building",
        "latitude": 45.495100,
        "longitude": -73.579200,
        "difficulty": "medium",
        "image_file": "sample_3.jpeg"
    },
    {
        "name": "Visual Arts Building",
        "latitude": 45.494800,
        "longitude": -73.578400,
        "difficulty": "hard",
        "image_file": "sample_4.jpeg"
    },
    {
        "name": "Central Building (Loyola)",
        "latitude": 45.458400,
        "longitude": -73.640200,
        "difficulty": "easy",
        "image_file": "sample_5.jpeg"
    },
]


async def seed_with_images():
    """Upload images to S3 and create locations."""
    
    print("="*70)
    print("Seed Locations with S3 Images")
    print("="*70)
    
    # Test S3 connection
    print("\n🔌 Testing S3 connection...")
    if not s3_service.test_connection():
        print("❌ S3 connection failed!")
        print("Please check your AWS credentials in .env")
        return False
    print("✓ S3 connection successful!")
    
    # Connect to MongoDB
    print(f"\n🔌 Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]
    print("✓ Connected to MongoDB")
    
    # Find Pics directory
    pics_dir = Path(__file__).parent.parent / "Pics"
    if not pics_dir.exists():
        print(f"\n❌ Pics directory not found at: {pics_dir}")
        return False
    
    try:
        # Check existing locations
        existing_count = await db.locations.count_documents({})
        if existing_count > 0:
            response = input(f"\n⚠️  Database has {existing_count} locations. Clear and reseed? (y/N): ")
            if response.lower() == 'y':
                await db.locations.delete_many({})
                print("✓ Cleared existing locations")
            else:
                print("Cancelled.")
                return False
        
        # Process each location
        created_count = 0
        for loc_data in LOCATION_DATA:
            image_file = pics_dir / loc_data["image_file"]
            
            if not image_file.exists():
                print(f"\n⚠️  Image not found: {image_file.name}, skipping...")
                continue
            
            print(f"\n📍 Processing: {loc_data['name']}")
            print(f"   Image: {loc_data['image_file']}")
            
            # Read and upload image
            try:
                with open(image_file, 'rb') as f:
                    image_content = f.read()
                
                content_type = "image/jpeg" if image_file.suffix.lower() in ['.jpg', '.jpeg'] else "image/png"
                
                image_url = s3_service.upload_image(
                    file_content=image_content,
                    filename=image_file.name,
                    content_type=content_type
                )
                
                if not image_url:
                    print(f"   ❌ Failed to upload image")
                    continue
                
                print(f"   ✓ Uploaded to: {image_url}")
                
                # Create location in database
                location_doc = {
                    "name": loc_data["name"],
                    "latitude": loc_data["latitude"],
                    "longitude": loc_data["longitude"],
                    "image_url": image_url,
                    "difficulty": loc_data["difficulty"],
                    "created_at": None  # Will be set by datetime.utcnow() if using model
                }
                
                result = await db.locations.insert_one(location_doc)
                print(f"   ✓ Created location in DB: {result.inserted_id}")
                created_count += 1
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
        
        print("\n" + "="*70)
        print(f"✅ Successfully created {created_count} locations!")
        print("="*70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False
    finally:
        client.close()
        print("\n✓ Database connection closed")


def main():
    """Run the seed script."""
    result = asyncio.run(seed_with_images())
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
