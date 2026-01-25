"""
Migration script to add floor field to existing locations near buildings.
Sets floor to "1" (string) for locations within building radius.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import from src
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config_buildings import find_nearby_building
from src.database import Database


async def migrate_locations():
    """Update existing locations to have floor=1 if they're near buildings."""
    
    # Connect to database
    await Database.connect()
    db = Database.get_database()
    collection = db.locations
    
    # Get all locations
    locations = []
    async for location in collection.find({}):
        locations.append(location)
    
    print(f"Found {len(locations)} locations to check...")
    
    updated_count = 0
    
    for location in locations:
        location_id = location["_id"]
        lat = location.get("latitude")
        lng = location.get("longitude")
        
        if lat is None or lng is None:
            print(f"Skipping location {location_id}: missing coordinates")
            continue
        
        # Check if location is near a building
        nearby_building = find_nearby_building(lat, lng)
        
        if nearby_building:
            # Check if location already has floor field
            if "floor" not in location or location.get("floor") is None:
                # Update location with building_id and floor="1" (string)
                update_result = await collection.update_one(
                    {"_id": location_id},
                    {
                        "$set": {
                            "building_id": nearby_building.id,
                            "floor": "1"  # String as requested
                        }
                    }
                )
                
                if update_result.modified_count > 0:
                    updated_count += 1
                    print(f"✓ Updated location {location_id} ({location.get('name', 'unnamed')}) - Building: {nearby_building.name}, Floor: 1")
            else:
                # Already has floor, just ensure building_id is set
                if location.get("building_id") != nearby_building.id:
                    await collection.update_one(
                        {"_id": location_id},
                        {"$set": {"building_id": nearby_building.id}}
                    )
                    print(f"✓ Updated building_id for location {location_id} ({location.get('name', 'unnamed')})")
    
    print(f"\n✅ Migration complete! Updated {updated_count} locations.")
    return updated_count


async def main():
    """Main entry point."""
    try:
        updated = await migrate_locations()
        print(f"\n🎉 Successfully migrated {updated} locations!")
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Close database connection
        await Database.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
