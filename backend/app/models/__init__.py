"""orm models package: exports all sqlalchemy table models."""

from app.models.location import Location
from app.models.game_session import GameSession
from app.models.leaderboard import LeaderboardEntry
from app.models.lobby import Lobby
from app.models.multiplayer_game import MultiplayerGame
from app.models.university import University

__all__ = ["Location", "GameSession", "LeaderboardEntry", "Lobby", "MultiplayerGame", "University"]
