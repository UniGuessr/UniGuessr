"""pydantic schemas for single-player session and guess payloads."""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DifficultyEnum(str, Enum):
    easy = "easy"
    normal = "normal"
    hard = "hard"


class Guess(BaseModel):
    location_id: str
    guessed_latitude: float
    guessed_longitude: float
    actual_latitude: float
    actual_longitude: float
    distance_meters: float
    points: int
    guessed_floor: Optional[int] = None
    actual_floor: Optional[int] = None
    floor_bonus: int = 0
    speed_bonus: int = 0
    timestamp: datetime


class SessionCreate(BaseModel):
    rounds: int = Field(default=5, ge=1, le=20)
    difficulty: DifficultyEnum = DifficultyEnum.easy
    university: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rounds: int
    difficulty: str
    location_ids: List[str]
    current_round: int
    guesses: List[Guess]
    total_score: int
    status: str
    university: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v)


class GuessSubmit(BaseModel):
    latitude: float
    longitude: float
    floor: Optional[int] = None
    # Single-player only: the on-screen round timer state at submit time, used to
    # award a speed bonus. Multiplayer ignores these and times the round server-side.
    seconds_remaining: Optional[float] = None
    timer_duration: Optional[float] = None
