from datetime import datetime
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class DifficultyEnum(str, Enum):
    """Difficulty levels for the game."""
    easy = "easy"
    normal = "normal"
    hard = "hard"


class Guess(BaseModel):
    """A guess made in a game session."""
    
    location_id: str = Field(..., description="ID of the location being guessed")
    guessed_latitude: float = Field(..., description="Guessed latitude")
    guessed_longitude: float = Field(..., description="Guessed longitude")
    actual_latitude: float = Field(..., description="Actual latitude")
    actual_longitude: float = Field(..., description="Actual longitude")
    distance_meters: float = Field(..., description="Distance from actual location in meters")
    points: int = Field(..., description="Points earned for this guess")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Session(BaseModel):
    """Game session model."""
    
    id: Optional[str] = Field(None, alias="_id")
    rounds: int = Field(..., description="Total number of rounds", ge=1, le=20)
    difficulty: DifficultyEnum = Field(default=DifficultyEnum.easy, description="Game difficulty level")
    location_ids: List[str] = Field(..., description="List of location IDs for this session")
    current_round: int = Field(default=0, description="Current round number (0-indexed)")
    guesses: List[Guess] = Field(default_factory=list, description="List of guesses made")
    total_score: int = Field(default=0, description="Total score accumulated")
    status: str = Field(default="active", description="Session status: active, completed")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        use_enum_values = True


class SessionCreate(BaseModel):
    """Schema for creating a new session."""
    
    rounds: int = Field(default=5, description="Number of rounds to play", ge=1, le=20)
    difficulty: DifficultyEnum = Field(default=DifficultyEnum.easy, description="Game difficulty level")
    
    class Config:
        use_enum_values = True


class SessionResponse(BaseModel):
    """Response schema for session."""
    
    id: str = Field(..., alias="_id")
    rounds: int
    difficulty: str
    location_ids: List[str]
    current_round: int
    guesses: List[Guess]
    total_score: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True


class GuessSubmit(BaseModel):
    """Schema for submitting a guess."""
    
    latitude: float = Field(..., description="Guessed latitude")
    longitude: float = Field(..., description="Guessed longitude")
