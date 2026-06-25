"""api routers package: exports all fastapi routers."""

from app.api.leaderboard import router as leaderboard_router
from app.api.locations import router as locations_router
from app.api.multiplayer import router as multiplayer_router
from app.api.sessions import router as sessions_router

__all__ = ["locations_router", "sessions_router", "leaderboard_router", "multiplayer_router"]
