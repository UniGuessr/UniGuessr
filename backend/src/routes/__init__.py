from src.routes.locations import router as locations_router
from src.routes.sessions import router as sessions_router
from src.routes.leaderboard import router as leaderboard_router
from src.routes.multiplayer import router as multiplayer_router

__all__ = ["locations_router", "sessions_router", "leaderboard_router", "multiplayer_router"]
