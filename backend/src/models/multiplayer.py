from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from src.models.session import Guess, DifficultyEnum


class Player(BaseModel):
    """Player in a lobby or game."""
    
    id: str = Field(..., description="Unique player ID")
    username: str = Field(..., description="Player username", min_length=3, max_length=20)
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    is_host: bool = Field(default=False, description="Whether this player is the lobby host")
    ready: bool = Field(default=False, description="Ready to start game")


class PlayerGameState(BaseModel):
    """Per-player game state in a multiplayer game."""
    
    player_id: str = Field(..., description="Player ID")
    username: str = Field(..., description="Player username")
    guesses: List[Guess] = Field(default_factory=list, description="All guesses made")
    total_score: int = Field(default=0, description="Total score accumulated")
    ready_for_next_round: bool = Field(default=False, description="Ready to advance to next round")
    disconnected: bool = Field(default=False, description="Player disconnected")


class Lobby(BaseModel):
    """Lobby model for multiplayer games."""
    
    id: Optional[str] = Field(None, alias="_id")
    code: str = Field(..., description="6-character join code")
    host_id: str = Field(..., description="ID of the host player")
    players: List[Player] = Field(default_factory=list, description="Players in lobby (max 4)")
    rounds: int = Field(..., description="Number of rounds", ge=1, le=20)
    difficulty: DifficultyEnum = Field(default=DifficultyEnum.easy, description="Game difficulty")
    status: str = Field(default="waiting", description="Lobby status: waiting, starting, active, completed")
    matchmaking: bool = Field(default=False, description="True if auto-matchmaking lobby")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        use_enum_values = True


class MultiplayerGame(BaseModel):
    """Multiplayer game session."""
    
    id: Optional[str] = Field(None, alias="_id")
    lobby_id: str = Field(..., description="Reference to original lobby")
    location_ids: List[str] = Field(..., description="Location IDs for all rounds (same for all players)")
    current_round: int = Field(default=0, description="Current round number (0-indexed)")
    players: List[PlayerGameState] = Field(default_factory=list, description="Per-player game states")
    status: str = Field(default="active", description="Game status: active, completed")
    round_started_at: datetime = Field(default_factory=datetime.utcnow, description="When current round started (for timeout)")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True


class LobbyCreate(BaseModel):
    """Schema for creating a lobby."""
    
    rounds: int = Field(default=5, description="Number of rounds", ge=1, le=20)
    difficulty: DifficultyEnum = Field(default=DifficultyEnum.easy, description="Game difficulty")
    matchmaking: bool = Field(default=False, description="Enable auto-matchmaking")
    
    class Config:
        use_enum_values = True


class LobbyJoin(BaseModel):
    """Schema for joining a lobby."""
    
    username: str = Field(..., description="Player username", min_length=3, max_length=20)


class MatchmakingJoin(BaseModel):
    """Schema for joining matchmaking queue."""
    
    username: str = Field(..., description="Player username", min_length=3, max_length=20)
    rounds: int = Field(default=5, description="Number of rounds", ge=1, le=20)
    difficulty: DifficultyEnum = Field(default=DifficultyEnum.easy, description="Game difficulty")
    
    class Config:
        use_enum_values = True
