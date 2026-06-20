"""pydantic schemas for multiplayer lobby and game payloads."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.session import DifficultyEnum, Guess


class Player(BaseModel):
    id: str
    username: str = Field(..., min_length=3, max_length=20)
    joined_at: datetime
    is_host: bool = False
    ready: bool = False


class PlayerGameState(BaseModel):
    player_id: str
    username: str
    guesses: List[Guess] = []
    total_score: int = 0
    ready_for_next_round: bool = False
    disconnected: bool = False


class LobbyCreate(BaseModel):
    rounds: int = Field(default=5, ge=1, le=20)
    difficulty: DifficultyEnum = DifficultyEnum.easy
    matchmaking: bool = False
    university: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class LobbyJoin(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)


class MatchmakingJoin(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    rounds: int = Field(default=5, ge=1, le=20)
    difficulty: DifficultyEnum = DifficultyEnum.easy
    university: Optional[str] = None

    model_config = ConfigDict(use_enum_values=True)


class LobbyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    host_id: str
    players: List[Player]
    rounds: int
    difficulty: str
    status: str
    matchmaking: bool
    university: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v)


class MultiplayerGameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    lobby_id: str
    location_ids: List[str]
    current_round: int
    players: List[PlayerGameState]
    status: str
    round_started_at: datetime
    started_at: datetime
    completed_at: Optional[datetime] = None

    @field_validator("id", "lobby_id", mode="before")
    @classmethod
    def coerce_uuids(cls, v):
        return str(v)
