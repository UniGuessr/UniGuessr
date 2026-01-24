from datetime import datetime
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from math import radians, sin, cos, sqrt, atan2, exp

from src.models.session import Session, SessionCreate, Guess, GuessSubmit
from src.services.location_service import LocationService


class SessionService:
    """Service for managing game sessions."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.sessions
        self.location_service = LocationService(db)
    
    async def create_session(self, session_create: SessionCreate) -> Optional[Session]:
        """Create a new game session.
        
        Args:
            session_create: Session creation parameters (rounds, difficulty)
        
        Returns:
            Created session with randomly selected locations
        """
        # Get random locations based on the number of rounds
        # Difficulty filtering is not implemented yet as per user request
        locations = await self.location_service.get_random_locations(
            count=session_create.rounds,
            difficulty=None  # Not filtering by difficulty yet
        )
        
        # Check if we have enough locations
        if len(locations) < session_create.rounds:
            return None  # Not enough locations available
        
        session_dict = {
            "rounds": session_create.rounds,
            "difficulty": session_create.difficulty,
            "location_ids": [loc.id for loc in locations],
            "current_round": 0,
            "guesses": [],
            "total_score": 0,
            "status": "active",
            "started_at": datetime.utcnow(),
            "completed_at": None
        }
        
        result = await self.collection.insert_one(session_dict)
        session_dict["_id"] = str(result.inserted_id)
        return Session(**session_dict)
    
    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        if not ObjectId.is_valid(session_id):
            return None
        
        session = await self.collection.find_one({"_id": ObjectId(session_id)})
        if session:
            session["_id"] = str(session["_id"])
            return Session(**session)
        return None
    
    async def get_current_location(self, session_id: str):
        """Get the current location for the session."""
        session = await self.get_session(session_id)
        if not session or session.status != "active":
            return None
        
        if session.current_round >= session.rounds:
            return None
        
        location_id = session.location_ids[session.current_round]
        return await self.location_service.get_location(location_id)
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates using Haversine formula (in meters)."""
        R = 6371000  # Earth's radius in meters
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)
        
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return R * c
    
    def calculate_points(self, distance_meters: float) -> int:
        """Calculate points based on distance using continuous exponential decay.
        
        Returns a score from 0-1000 where:
        - 0 meters = 1000 points
        - Points decrease exponentially as distance increases
        - At ~500m, you get about 100 points
        - Beyond 2000m, points approach 0
        
        Args:
            distance_meters: Distance in meters from actual location
            
        Returns:
            Integer score from 0 to 1000
        """
        # Exponential decay formula: points = 1000 * e^(-distance / scale)
        # Scale factor determines how quickly points decay
        # Higher scale = more forgiving, lower scale = stricter
        scale_factor = 200  # Adjust this to tune difficulty
        
        points = 1000 * exp(-distance_meters / scale_factor)
        
        return max(0, round(points))
    
    async def submit_guess(self, session_id: str, guess_submit: GuessSubmit) -> Optional[dict]:
        """Submit a guess for the current round."""
        session = await self.get_session(session_id)
        if not session or session.status != "active":
            return None
        
        if session.current_round >= session.rounds:
            return None
        
        # Get the current location
        location = await self.get_current_location(session_id)
        if not location:
            return None
        
        # Calculate distance and points
        distance = self.calculate_distance(
            guess_submit.latitude,
            guess_submit.longitude,
            location.latitude,
            location.longitude
        )
        points = self.calculate_points(distance)
        
        # Create guess record
        guess = Guess(
            location_id=location.id,
            guessed_latitude=guess_submit.latitude,
            guessed_longitude=guess_submit.longitude,
            actual_latitude=location.latitude,
            actual_longitude=location.longitude,
            distance_meters=distance,
            points=points,
            timestamp=datetime.utcnow()
        )
        
        # Update session
        new_round = session.current_round + 1
        new_status = "completed" if new_round >= session.rounds else "active"
        completed_at = datetime.utcnow() if new_status == "completed" else None
        
        await self.collection.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$push": {"guesses": guess.model_dump()},
                "$inc": {"total_score": points},
                "$set": {
                    "current_round": new_round,
                    "status": new_status,
                    "completed_at": completed_at
                }
            }
        )
        
        # Return guess result with location info
        return {
            "guess": guess,
            "location": location,
            "round_complete": True,
            "game_complete": new_status == "completed",
            "current_round": new_round,
            "total_score": session.total_score + points
        }
