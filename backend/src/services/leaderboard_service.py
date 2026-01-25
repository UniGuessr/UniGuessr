from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.models.leaderboard import LeaderboardEntry, LeaderboardEntryCreate


class LeaderboardService:
    """Service for managing leaderboard entries."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.leaderboard
    
    async def create_entry(self, entry: LeaderboardEntryCreate) -> str:
        """Create a new leaderboard entry."""
        entry_dict = entry.model_dump()
        result = await self.collection.insert_one(entry_dict)
        return str(result.inserted_id)
    
    async def get_entry(self, entry_id: str) -> Optional[LeaderboardEntry]:
        """Get a leaderboard entry by ID."""
        if not ObjectId.is_valid(entry_id):
            return None
        
        entry = await self.collection.find_one({"_id": ObjectId(entry_id)})
        if entry:
            entry["_id"] = str(entry["_id"])
            return LeaderboardEntry(**entry)
        return None
    
    async def get_top_scores(
        self,
        limit: int = 100,
        rounds: Optional[int] = None,
        difficulty: Optional[str] = None
    ) -> List[LeaderboardEntry]:
        """Get top scores with optional filtering.
        
        Args:
            limit: Maximum number of entries to return
            rounds: Filter by number of rounds (category)
            difficulty: Filter by difficulty level
        
        Returns:
            List of leaderboard entries sorted by score (descending)
        """
        # Build filter query
        filter_query = {}
        if rounds is not None:
            filter_query["rounds"] = rounds
        if difficulty is not None:
            filter_query["difficulty"] = difficulty
        
        # Query with filter and sort by score descending
        cursor = self.collection.find(filter_query).sort("score", -1).limit(limit)
        entries = []
        async for entry in cursor:
            entry["_id"] = str(entry["_id"])
            entries.append(LeaderboardEntry(**entry))
        return entries
    
    async def get_user_rank(
        self,
        username: str,
        rounds: Optional[int] = None,
        difficulty: Optional[str] = None
    ) -> Optional[int]:
        """Get the rank of a specific user.
        
        Args:
            username: Username to get rank for
            rounds: Filter by number of rounds
            difficulty: Filter by difficulty level
        
        Returns:
            Rank (1-indexed) or None if user not found
        """
        # Build filter query
        filter_query = {}
        if rounds is not None:
            filter_query["rounds"] = rounds
        if difficulty is not None:
            filter_query["difficulty"] = difficulty
        
        # Get user's best score
        user_filter = filter_query.copy()
        user_filter["username"] = username
        
        user_entry = await self.collection.find_one(
            user_filter,
            sort=[("score", -1)]
        )
        
        if not user_entry:
            return None
        
        # Count how many entries have a higher score
        filter_query["score"] = {"$gt": user_entry["score"]}
        higher_count = await self.collection.count_documents(filter_query)
        
        return higher_count + 1
    
    async def get_all_entries(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[LeaderboardEntry]:
        """Get all leaderboard entries with pagination."""
        cursor = self.collection.find().sort("score", -1).skip(skip).limit(limit)
        entries = []
        async for entry in cursor:
            entry["_id"] = str(entry["_id"])
            entries.append(LeaderboardEntry(**entry))
        return entries
    
    async def count_entries(
        self,
        rounds: Optional[int] = None,
        difficulty: Optional[str] = None
    ) -> int:
        """Count total number of entries with optional filters."""
        filter_query = {}
        if rounds is not None:
            filter_query["rounds"] = rounds
        if difficulty is not None:
            filter_query["difficulty"] = difficulty
        
        return await self.collection.count_documents(filter_query)
