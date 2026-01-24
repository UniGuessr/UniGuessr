from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.models.location import Location, LocationCreate


class LocationService:
    """Service for managing locations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.locations
    
    async def create_location(self, location: LocationCreate) -> str:
        """Create a new location."""
        location_dict = location.model_dump()
        result = await self.collection.insert_one(location_dict)
        return str(result.inserted_id)
    
    async def get_location(self, location_id: str) -> Optional[Location]:
        """Get a location by ID."""
        if not ObjectId.is_valid(location_id):
            return None
        
        location = await self.collection.find_one({"_id": ObjectId(location_id)})
        if location:
            location["_id"] = str(location["_id"])
            return Location(**location)
        return None
    
    async def get_all_locations(self, skip: int = 0, limit: int = 100) -> List[Location]:
        """Get all locations with pagination."""
        cursor = self.collection.find().skip(skip).limit(limit)
        locations = []
        async for location in cursor:
            location["_id"] = str(location["_id"])
            locations.append(Location(**location))
        return locations
    
    async def get_random_locations(self, count: int, difficulty: Optional[str] = None) -> List[Location]:
        """Get random locations for a game session.
        
        Args:
            count: Number of locations to retrieve
            difficulty: Optional difficulty filter (not implemented yet)
        
        Returns:
            List of random locations
        """
        # For now, ignore difficulty filter as per user request
        # In the future, we can add: {"$match": {"difficulty": difficulty}}
        cursor = self.collection.aggregate([
            {"$sample": {"size": count}}
        ])
        locations = []
        async for location in cursor:
            location["_id"] = str(location["_id"])
            locations.append(Location(**location))
        return locations
    
    async def update_location(self, location_id: str, location_update: LocationCreate) -> bool:
        """Update a location."""
        if not ObjectId.is_valid(location_id):
            return False
        
        update_dict = location_update.model_dump(exclude_unset=True)
        result = await self.collection.update_one(
            {"_id": ObjectId(location_id)},
            {"$set": update_dict}
        )
        return result.modified_count > 0
    
    async def delete_location(self, location_id: str) -> bool:
        """Delete a location."""
        if not ObjectId.is_valid(location_id):
            return False
        
        result = await self.collection.delete_one({"_id": ObjectId(location_id)})
        return result.deleted_count > 0
    
    async def count_locations(self) -> int:
        """Count total number of locations."""
        return await self.collection.count_documents({})
