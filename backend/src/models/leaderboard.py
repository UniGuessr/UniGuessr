from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LeaderboardEntry(BaseModel):
    """Leaderboard entry model representing a user's score."""
    
    id: Optional[str] = Field(None, alias="_id")
    username: str = Field(..., description="Username of the player")
    score: int = Field(..., description="Total score achieved")
    rounds: int = Field(..., description="Number of rounds played (category)")
    difficulty: str = Field(..., description="Difficulty level: easy, normal, hard")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Date and time of the score")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "username": "player123",
                "score": 15000,
                "rounds": 5,
                "difficulty": "normal",
                "created_at": "2024-01-01T12:00:00Z"
            }
        }


class LeaderboardEntryCreate(BaseModel):
    """Schema for creating a new leaderboard entry."""
    
    username: str = Field(..., min_length=1, max_length=50, description="Username of the player")
    score: int = Field(..., ge=0, description="Total score achieved")
    rounds: int = Field(..., gt=0, description="Number of rounds played")
    difficulty: str = Field(..., description="Difficulty level: easy, normal, hard")


class LeaderboardEntryResponse(BaseModel):
    """Response schema for leaderboard entry."""
    
    id: str = Field(..., alias="_id")
    username: str
    score: int
    rounds: int
    difficulty: str
    created_at: datetime
    rank: Optional[int] = Field(None, description="Rank on the leaderboard")
    
    class Config:
        populate_by_name = True
