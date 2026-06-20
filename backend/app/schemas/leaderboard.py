from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LeaderboardEntryCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    score: int = Field(..., ge=0)
    rounds: int = Field(..., gt=0)
    difficulty: str
    university: Optional[str] = None


class LeaderboardEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    score: int
    rounds: int
    difficulty: str
    university: Optional[str] = None
    created_at: datetime
    rank: Optional[int] = None

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v)
