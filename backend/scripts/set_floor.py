"""
Simple script to set all locations' floor field to "1" (string).

Usage:
    cd backend
    uv run scripts/set_floor.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path so we can import from src
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings


async def set_all_floors():
    """Set all locations' floor field to "1"."""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(
        settings.mongodb_url,
        serverSelectionTimeoutMS=5000
    )
    db = client[settings.mongodb_db_name]
    collection = db.locations
    
    print(f"Connected to MongoDB: {settings.mongodb_db_name}")
    
    # Update all locations to have floor="1"
    result = await collection.update_many(
        {},  # Empty filter = all documents
        {
            "$set": {
                "floor": "1"
            }
        }
    )
    
    print(f"✅ Updated {result.modified_count} locations with floor='1'")
    
    # Close connection
    client.close()
    
    return result.modified_count


async def main():
    """Main entry point."""
    try:
        updated = await set_all_floors()
        print(f"\n🎉 Successfully set floor='1' for {updated} locations!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
