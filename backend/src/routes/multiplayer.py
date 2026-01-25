from fastapi import APIRouter, HTTPException, Depends, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

from src.database import get_db
from src.models.multiplayer import (
    LobbyCreate, LobbyJoin, MatchmakingJoin, Lobby, MultiplayerGame
)
from src.models.session import GuessSubmit
from src.services.multiplayer_service import MultiplayerService

router = APIRouter(prefix="/api/multiplayer", tags=["multiplayer"])


def get_multiplayer_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> MultiplayerService:
    """Dependency to get multiplayer service."""
    return MultiplayerService(db)


@router.post("/lobbies", response_model=dict, status_code=201)
async def create_lobby(
    lobby_create: LobbyCreate,
    host_username: str = Query(..., description="Username of the host player"),
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Create a new lobby.
    
    Args:
        lobby_create: Lobby configuration (rounds, difficulty, matchmaking)
        host_username: Username of the host player (query parameter)
    
    Returns:
        Lobby details with code and host_id
    """
    lobby = await service.create_lobby(lobby_create, host_username)
    if not lobby:
        raise HTTPException(status_code=400, detail="Failed to create lobby")
    
    return {
        "lobby_id": str(lobby.id),
        "code": lobby.code,
        "host_id": lobby.host_id,
        "lobby": lobby.model_dump()
    }


@router.get("/lobbies/{code}", response_model=dict)
async def get_lobby(
    code: str,
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Get lobby details by code."""
    lobby = await service.get_lobby(code)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    return lobby.model_dump()


@router.post("/lobbies/{code}/join", response_model=dict)
async def join_lobby(
    code: str,
    join_data: LobbyJoin,
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Join a lobby by code.
    
    Args:
        code: Lobby code
        join_data: Username
    
    Returns:
        Lobby details and player_id
    """
    result = await service.join_lobby(code, join_data.username)
    if not result:
        raise HTTPException(status_code=404, detail="Lobby not found")
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "lobby": result["lobby"].model_dump(),
        "player_id": result["player_id"]
    }


@router.post("/lobbies/{code}/ready", response_model=dict)
async def toggle_ready(
    code: str,
    player_id: str,
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Toggle player ready status."""
    lobby = await service.toggle_player_ready(code, player_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby or player not found")
    return lobby.model_dump()


@router.post("/lobbies/{code}/leave")
async def leave_lobby(
    code: str,
    player_id: str = Body(..., embed=True),
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Leave a lobby."""
    success = await service.leave_lobby(code, player_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lobby not found")
    return {"success": True}


@router.post("/lobbies/{code}/start", response_model=dict)
async def start_game(
    code: str,
    host_id: str = Body(..., embed=True),
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Start a game from a lobby (host only).
    
    Args:
        code: Lobby code
        host_id: Host player ID (from request body)
    
    Returns:
        Game ID and game details
    """
    game = await service.start_game(code, host_id)
    if not game:
        raise HTTPException(
            status_code=400,
            detail="Cannot start game. Make sure you're the host and lobby has at least 2 players."
        )
    
    # Notify all players in the lobby via WebSocket
    from src.routes.websocket import emit_game_started
    await emit_game_started(code, str(game.id))
    
    return {
        "game_id": str(game.id),
        "game": game.model_dump()
    }


@router.post("/matchmaking/join", response_model=dict)
async def join_matchmaking(
    matchmaking_data: MatchmakingJoin,
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Join matchmaking queue or create/join a lobby.
    
    Returns:
        Lobby details and player_id
    """
    # Try to find existing matchmaking lobby
    lobby = await service.find_matchmaking_lobby(
        matchmaking_data.rounds,
        matchmaking_data.difficulty
    )
    
    if lobby:
        # Join existing lobby
        result = await service.join_lobby(lobby.code, matchmaking_data.username)
        if result and "error" not in result:
            return {
                "lobby": result["lobby"].model_dump(),
                "player_id": result["player_id"]
            }
    
    # Create new matchmaking lobby
    lobby_create = LobbyCreate(
        rounds=matchmaking_data.rounds,
        difficulty=matchmaking_data.difficulty,
        matchmaking=True
    )
    lobby = await service.create_lobby(lobby_create, matchmaking_data.username)
    
    if not lobby:
        raise HTTPException(status_code=400, detail="Failed to create matchmaking lobby")
    
    return {
        "lobby_id": str(lobby.id),
        "code": lobby.code,
        "host_id": lobby.host_id,
        "player_id": lobby.host_id,  # Host is the first player
        "lobby": lobby.model_dump()
    }


@router.post("/matchmaking/leave")
async def leave_matchmaking(
    code: str,
    player_id: str = Body(..., embed=True),
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Leave matchmaking lobby."""
    success = await service.leave_lobby(code, player_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lobby not found")
    return {"success": True}


@router.get("/games/{game_id}", response_model=dict)
async def get_game(
    game_id: str,
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Get multiplayer game details."""
    game = await service.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game.model_dump()


@router.get("/games/{game_id}/current-location", response_model=dict)
async def get_current_location(
    game_id: str,
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Get current location for the game (same for all players)."""
    game = await service.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.status != "active":
        raise HTTPException(status_code=400, detail="Game is not active")
    
    if game.current_round >= len(game.location_ids):
        raise HTTPException(status_code=400, detail="No more rounds available")
    
    location = await service.get_current_location(game_id)
    if not location:
        raise HTTPException(status_code=404, detail="Current location not found")
    
    return {
        "location_id": location.id,
        "image_url": location.image_url,
        "name": location.name,
        "building_id": location.building_id,
        "round": game.current_round + 1,
        "total_rounds": len(game.location_ids)
    }


@router.post("/games/{game_id}/guess", response_model=dict)
async def submit_guess(
    game_id: str,
    player_id: str = Body(..., embed=True),
    latitude: float = Body(..., embed=True),
    longitude: float = Body(..., embed=True),
    floor: Optional[int] = Body(None, embed=True),
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Submit a guess for a player in multiplayer game."""
    guess = GuessSubmit(latitude=latitude, longitude=longitude, floor=floor)
    result = await service.submit_guess(game_id, player_id, guess)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit guess. Game may be inactive or you already submitted."
        )
    
    game = result["game"]
    all_submitted = result["all_submitted"]
    
    # Notify all players that a guess was submitted
    from src.routes.websocket import emit_game_update
    await emit_game_update(game_id, "guess_submitted", {
        "player_id": player_id,
        "all_submitted": all_submitted
    })
    
    # Check if round should advance (all submitted)
    if all_submitted:
        await emit_game_update(game_id, "round_complete", {
            "round": game.current_round
        })
    
    return {
        "distance_meters": result["guess"].distance_meters,
        "points": result["guess"].points,
        "floor_bonus": result["guess"].floor_bonus,
        "guessed_floor": result["guess"].guessed_floor,
        "actual_floor": result["guess"].actual_floor,
        "actual_location": {
            "latitude": result["location"].latitude,
            "longitude": result["location"].longitude,
            "name": result["location"].name,
            "building_id": result["location"].building_id,
            "floor": result["location"].floor
        },
        "guessed_location": {
            "latitude": result["guess"].guessed_latitude,
            "longitude": result["guess"].guessed_longitude
        },
        "all_submitted": all_submitted,
        "game": game.model_dump()
    }


@router.post("/games/{game_id}/ready", response_model=dict)
async def mark_ready_next_round(
    game_id: str,
    player_id: str = Body(..., embed=True),
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Mark player as ready for next round."""
    # Get game state before marking ready
    game_before = await service.get_game(game_id)
    if not game_before:
        raise HTTPException(status_code=404, detail="Game not found")
    
    current_round_before = game_before.current_round
    status_before = game_before.status
    
    # Mark player ready (may advance round)
    game = await service.mark_ready_for_next_round(game_id, player_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if round advanced or game completed
    from src.routes.websocket import emit_game_update
    
    if game.status == "completed" and status_before != "completed":
        # Game just completed
        await emit_game_update(game_id, "game_complete", {
            "final_round": game.current_round
        })
    elif game.current_round > current_round_before:
        # Round advanced
        await emit_game_update(game_id, "round_started", {
            "round": game.current_round
        })
    
    return game.model_dump()


@router.get("/games/{game_id}/leaderboard", response_model=dict)
async def get_leaderboard(
    game_id: str,
    service: MultiplayerService = Depends(get_multiplayer_service)
):
    """Get current leaderboard for the game."""
    game = await service.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Sort players by total_score (descending)
    sorted_players = sorted(
        game.players,
        key=lambda p: p.total_score,
        reverse=True
    )
    
    return {
        "players": [
            {
                "player_id": p.player_id,
                "username": p.username,
                "total_score": p.total_score,
                "rounds_completed": len(p.guesses)
            }
            for p in sorted_players
        ],
        "current_round": game.current_round,
        "total_rounds": len(game.location_ids),
        "status": game.status
    }
