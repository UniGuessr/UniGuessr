"""
Seed script to populate the database with sample Concordia campus locations.

Usage:
    cd backend
    uv run scripts/seed_locations.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path so we can import from src
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings


# Sample locations around Concordia University campuses (SGW and Loyola)
SAMPLE_LOCATIONS = [
    # SGW Campus - Downtown Montreal
    {
        "name": "Hall Building",
        "latitude": 45.497200,
        "longitude": -73.578900,
        "image_url": "https://picsum.photos/seed/hall/800/600",
        "difficulty": "easy"
    },
    {
        "name": "Henry F. Hall Building Entrance",
        "latitude": 45.497100,
        "longitude": -73.579200,
        "image_url": "https://picsum.photos/seed/hall2/800/600",
        "difficulty": "easy"
    },
    {
        "name": "EV Building",
        "latitude": 45.495400,
        "longitude": -73.578000,
        "image_url": "https://picsum.photos/seed/ev/800/600",
        "difficulty": "medium"
    },
    {
        "name": "John Molson Building",
        "latitude": 45.495100,
        "longitude": -73.579200,
        "image_url": "https://picsum.photos/seed/jmsb/800/600",
        "difficulty": "medium"
    },
    {
        "name": "Visual Arts Building (VA)",
        "latitude": 45.494800,
        "longitude": -73.578400,
        "image_url": "https://picsum.photos/seed/va/800/600",
        "difficulty": "hard"
    },
    {
        "name": "Grey Nuns Building (GN)",
        "latitude": 45.491600,
        "longitude": -73.577900,
        "image_url": "https://picsum.photos/seed/gn/800/600",
        "difficulty": "hard"
    },
    {
        "name": "Guy-De Maisonneuve Building (GM)",
        "latitude": 45.496900,
        "longitude": -73.578200,
        "image_url": "https://picsum.photos/seed/gm/800/600",
        "difficulty": "medium"
    },
    {
        "name": "J.W. McConnell Building (LB)",
        "latitude": 45.497500,
        "longitude": -73.577800,
        "image_url": "https://picsum.photos/seed/lb/800/600",
        "difficulty": "medium"
    },
    {
        "name": "Faubourg Building (FB)",
        "latitude": 45.495600,
        "longitude": -73.577300,
        "image_url": "https://picsum.photos/seed/fb/800/600",
        "difficulty": "hard"
    },
    {
        "name": "Engineering Computer Science and Visual Arts (EV)",
        "latitude": 45.495500,
        "longitude": -73.577900,
        "image_url": "https://picsum.photos/seed/ev2/800/600",
        "difficulty": "easy"
    },
    
    # Loyola Campus - West Montreal
    {
        "name": "Central Building (Loyola)",
        "latitude": 45.458400,
        "longitude": -73.640200,
        "image_url": "https://picsum.photos/seed/central/800/600",
        "difficulty": "easy"
    },
    {
        "name": "Student Centre (Loyola)",
        "latitude": 45.458100,
        "longitude": -73.640600,
        "image_url": "https://picsum.photos/seed/studentcentre/800/600",
        "difficulty": "medium"
    },
    {
        "name": "Richard J. Renaud Science Complex (Loyola)",
        "latitude": 45.457800,
        "longitude": -73.639800,
        "image_url": "https://picsum.photos/seed/science/800/600",
        "difficulty": "medium"
    },
    {
        "name": "Vanier Library (Loyola)",
        "latitude": 45.458300,
        "longitude": -73.640100,
        "image_url": "https://picsum.photos/seed/vanier/800/600",
        "difficulty": "easy"
    },
    {
        "name": "Stinger Dome (Loyola)",
        "latitude": 45.457200,
        "longitude": -73.641100,
        "image_url": "https://picsum.photos/seed/dome/800/600",
        "difficulty": "hard"
    },
    {
        "name": "Psychology Building (Loyola)",
        "latitude": 45.458600,
        "longitude": -73.640400,
        "image_url": "https://picsum.photos/seed/psych/800/600",
        "difficulty": "hard"
    },
    {
        "name": "Communication Studies Building (Loyola)",
        "latitude": 45.458200,
        "longitude": -73.639600,
        "image_url": "https://picsum.photos/seed/comm/800/600",
        "difficulty": "medium"
    },
    {
        "name": "Concordia Greenhouse (Loyola)",
        "latitude": 45.457900,
        "longitude": -73.640800,
        "image_url": "https://picsum.photos/seed/greenhouse/800/600",
        "difficulty": "hard"
    },
    
    # Additional iconic spots
    {
        "name": "Guy-Concordia Metro Station Entrance",
        "latitude": 45.496600,
        "longitude": -73.577500,
        "image_url": "https://picsum.photos/seed/metro/800/600",
        "difficulty": "easy"
    },
    {
        "name": "Webster Library",
        "latitude": 45.497000,
        "longitude": -73.578500,
        "image_url": "https://picsum.photos/seed/webster/800/600",
        "difficulty": "medium"
    },
]


async def seed_database(clear_existing: bool = False):
    """Seed the database with sample locations.
    
    Args:
        clear_existing: If True, delete all existing locations before seeding
    """
    print(f"Connecting to MongoDB at {settings.mongodb_url}")
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]
    
    try:
        # Check existing locations
        existing_count = await db.locations.count_documents({})
        print(f"Found {existing_count} existing locations in database")
        
        if existing_count > 0 and not clear_existing:
            print("\n⚠️  Database already has locations!")
            print("Options:")
            print("  1. Run with --clear to delete existing and reseed")
            print("  2. Add new locations without clearing (will duplicate if run multiple times)")
            response = input("\nAdd new locations anyway? (y/N): ").strip().lower()
            if response != 'y':
                print("Cancelled. No changes made.")
                return
        
        if clear_existing and existing_count > 0:
            print(f"Clearing {existing_count} existing locations...")
            await db.locations.delete_many({})
            print("✓ Cleared existing locations")
        
        # Insert sample locations
        print(f"\nInserting {len(SAMPLE_LOCATIONS)} sample locations...")
        result = await db.locations.insert_many(SAMPLE_LOCATIONS)
        print(f"✓ Successfully inserted {len(result.inserted_ids)} locations")
        
        # Display summary
        print("\n" + "="*60)
        print("📍 LOCATIONS SEEDED BY DIFFICULTY:")
        print("="*60)
        
        for difficulty in ["easy", "medium", "hard"]:
            count = await db.locations.count_documents({"difficulty": difficulty})
            locations = await db.locations.find({"difficulty": difficulty}).to_list(length=None)
            print(f"\n{difficulty.upper()} ({count} locations):")
            for loc in locations:
                print(f"  • {loc['name']}")
        
        total = await db.locations.count_documents({})
        print("\n" + "="*60)
        print(f"✓ Total locations in database: {total}")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        client.close()
        print("\n✓ Database connection closed")


def main():
    """Main entry point for the seed script."""
    import sys
    
    # Check for --clear flag
    clear_existing = "--clear" in sys.argv or "-c" in sys.argv
    
    if clear_existing:
        print("⚠️  CLEAR MODE: Will delete all existing locations before seeding")
    
    asyncio.run(seed_database(clear_existing=clear_existing))


if __name__ == "__main__":
    main()
