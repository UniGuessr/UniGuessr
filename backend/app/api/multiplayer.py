"""multiplayer api: lobby creation, matchmaking, and game management."""

from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.websocket import emit_game_started, emit_game_update
from app.dependencies import get_db
from app.schemas.multiplayer import LobbyCreate, LobbyJoin, MatchmakingJoin
from app.schemas.session import GuessSubmit
from app.services import multiplayer_service

router = APIRouter(prefix="/api/multiplayer", tags=["multiplayer"])


@router.post("/lobbies", response_model=dict, status_code=201)
async def create_lobby(
    lobby_create: LobbyCreate,
    host_username: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    lobby = await multiplayer_service.create_lobby(lobby_create, host_username, db)
    if not lobby:
        raise HTTPException(status_code=400, detail="Failed to create lobby")
    return {
        "lobby_id": str(lobby.id),
        "code": lobby.code,
        "host_id": lobby.host_id,
        "lobby": {
            "id": str(lobby.id),
            "code": lobby.code,
            "host_id": lobby.host_id,
            "players": lobby.players,
            "rounds": lobby.rounds,
            "difficulty": lobby.difficulty,
            "status": lobby.status,
            "matchmaking": lobby.matchmaking,
            "university": lobby.university,
        },
    }


@router.get("/lobbies/{code}", response_model=dict)
async def get_lobby(code: str, db: AsyncSession = Depends(get_db)):
    lobby = await multiplayer_service.get_lobby(code, db)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    return {
        "id": str(lobby.id),
        "code": lobby.code,
        "host_id": lobby.host_id,
        "players": lobby.players,
        "rounds": lobby.rounds,
        "difficulty": lobby.difficulty,
        "status": lobby.status,
        "matchmaking": lobby.matchmaking,
        "university": lobby.university,
    }


@router.post("/lobbies/{code}/join", response_model=dict)
async def join_lobby(code: str, join_data: LobbyJoin, db: AsyncSession = Depends(get_db)):
    result = await multiplayer_service.join_lobby(code, join_data.username, db)
    if not result:
        raise HTTPException(status_code=404, detail="Lobby not found")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    lobby = result["lobby"]
    return {
        "lobby": {
            "id": str(lobby.id),
            "code": lobby.code,
            "host_id": lobby.host_id,
            "players": lobby.players,
            "rounds": lobby.rounds,
            "difficulty": lobby.difficulty,
            "status": lobby.status,
            "matchmaking": lobby.matchmaking,
            "university": lobby.university,
        },
        "player_id": result["player_id"],
    }


@router.post("/lobbies/{code}/ready", response_model=dict)
async def toggle_ready(
    code: str, player_id: str, db: AsyncSession = Depends(get_db)
):
    lobby = await multiplayer_service.toggle_player_ready(code, player_id, db)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby or player not found")
    return {
        "id": str(lobby.id),
        "code": lobby.code,
        "players": lobby.players,
        "status": lobby.status,
    }


@router.post("/lobbies/{code}/leave")
async def leave_lobby(
    code: str,
    player_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    if not await multiplayer_service.leave_lobby(code, player_id, db):
        raise HTTPException(status_code=404, detail="Lobby not found")
    return {"success": True}


@router.post("/lobbies/{code}/start", response_model=dict)
async def start_game(
    code: str,
    host_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    game = await multiplayer_service.start_game(code, host_id, db)
    if not game:
        raise HTTPException(
            status_code=400,
            detail="Cannot start game. Make sure you're the host and lobby has at least 2 players.",
        )
    await emit_game_started(code, str(game.id))
    return {
        "game_id": str(game.id),
        "game": {
            "id": str(game.id),
            "lobby_id": str(game.lobby_id),
            "location_ids": game.location_ids,
            "current_round": game.current_round,
            "players": game.players,
            "status": game.status,
            "university": game.university,
        },
    }


@router.post("/matchmaking/join", response_model=dict)
async def join_matchmaking(
    matchmaking_data: MatchmakingJoin, db: AsyncSession = Depends(get_db)
):
    lobby = await multiplayer_service.find_matchmaking_lobby(
        matchmaking_data.rounds, matchmaking_data.difficulty, db
    )
    if lobby:
        result = await multiplayer_service.join_lobby(lobby.code, matchmaking_data.username, db)
        if result and "error" not in result:
            lob = result["lobby"]
            return {
                "lobby": {
                    "id": str(lob.id),
                    "code": lob.code,
                    "players": lob.players,
                    "rounds": lob.rounds,
                    "difficulty": lob.difficulty,
                    "status": lob.status,
                    "university": lob.university,
                },
                "player_id": result["player_id"],
            }

    lobby_create = LobbyCreate(
        rounds=matchmaking_data.rounds,
        difficulty=matchmaking_data.difficulty,
        matchmaking=True,
        university=matchmaking_data.university,
    )
    lobby = await multiplayer_service.create_lobby(lobby_create, matchmaking_data.username, db)
    if not lobby:
        raise HTTPException(status_code=400, detail="Failed to create matchmaking lobby")
    return {
        "lobby_id": str(lobby.id),
        "code": lobby.code,
        "host_id": lobby.host_id,
        "player_id": lobby.host_id,
        "lobby": {
            "id": str(lobby.id),
            "code": lobby.code,
            "players": lobby.players,
            "rounds": lobby.rounds,
            "difficulty": lobby.difficulty,
            "status": lobby.status,
            "university": lobby.university,
        },
    }


@router.post("/matchmaking/leave")
async def leave_matchmaking(
    code: str,
    player_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    if not await multiplayer_service.leave_lobby(code, player_id, db):
        raise HTTPException(status_code=404, detail="Lobby not found")
    return {"success": True}


@router.get("/games/{game_id}", response_model=dict)
async def get_game(game_id: str, db: AsyncSession = Depends(get_db)):
    game = await multiplayer_service.get_game(game_id, db)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return {
        "id": str(game.id),
        "lobby_id": str(game.lobby_id),
        "location_ids": game.location_ids,
        "current_round": game.current_round,
        "players": game.players,
        "status": game.status,
        "university": game.university,
    }


@router.get("/games/{game_id}/current-location", response_model=dict)
async def get_current_location(game_id: str, db: AsyncSession = Depends(get_db)):
    game = await multiplayer_service.get_game(game_id, db)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.status != "active":
        raise HTTPException(status_code=400, detail="Game is not active")
    if game.current_round >= len(game.location_ids):
        raise HTTPException(status_code=400, detail="No more rounds available")

    location = await multiplayer_service.get_current_location(game_id, db)
    if not location:
        raise HTTPException(status_code=404, detail="Current location not found")

    return {
        "location_id": str(location.id),
        "image_url": location.image_url,
        "name": location.name,
        "building_id": location.building_id,
        "round": game.current_round + 1,
        "total_rounds": len(game.location_ids),
    }


@router.post("/games/{game_id}/guess", response_model=dict)
async def submit_guess(
    game_id: str,
    player_id: str = Body(..., embed=True),
    latitude: float = Body(..., embed=True),
    longitude: float = Body(..., embed=True),
    floor: Optional[int] = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
):
    guess = GuessSubmit(latitude=latitude, longitude=longitude, floor=floor)
    result = await multiplayer_service.submit_guess(game_id, player_id, guess, db)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit guess. Game may be inactive or you already submitted.",
        )

    game = result["game"]
    all_submitted = result["all_submitted"]
    await emit_game_update(game_id, "guess_submitted", {"player_id": player_id, "all_submitted": all_submitted})
    if all_submitted:
        await emit_game_update(game_id, "round_complete", {"round": game.current_round})

    return {
        "distance_meters": result["guess"].distance_meters,
        "points": result["guess"].points,
        "floor_bonus": result["guess"].floor_bonus,
        "speed_bonus": result["guess"].speed_bonus,
        "guessed_floor": result["guess"].guessed_floor,
        "actual_floor": result["guess"].actual_floor,
        "actual_location": {
            "latitude": result["location"].latitude,
            "longitude": result["location"].longitude,
            "name": result["location"].name,
            "building_id": result["location"].building_id,
            "floor": result["location"].floor,
        },
        "guessed_location": {
            "latitude": result["guess"].guessed_latitude,
            "longitude": result["guess"].guessed_longitude,
        },
        "all_submitted": all_submitted,
    }


@router.post("/games/{game_id}/ready", response_model=dict)
async def mark_ready_next_round(
    game_id: str,
    player_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    game_before = await multiplayer_service.get_game(game_id, db)
    if not game_before:
        raise HTTPException(status_code=404, detail="Game not found")

    round_before = game_before.current_round
    status_before = game_before.status

    game = await multiplayer_service.mark_ready_for_next_round(game_id, player_id, db)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if game.status == "completed" and status_before != "completed":
        await emit_game_update(game_id, "game_complete", {"final_round": game.current_round})
    elif game.current_round > round_before:
        await emit_game_update(game_id, "round_started", {"round": game.current_round})

    return {
        "id": str(game.id),
        "current_round": game.current_round,
        "players": game.players,
        "status": game.status,
    }


@router.get("/games/{game_id}/leaderboard", response_model=dict)
async def get_game_leaderboard(game_id: str, db: AsyncSession = Depends(get_db)):
    game = await multiplayer_service.get_game(game_id, db)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    from app.schemas.multiplayer import PlayerGameState

    players = [PlayerGameState(**p) for p in game.players]
    sorted_players = sorted(players, key=lambda p: p.total_score, reverse=True)
    return {
        "players": [
            {
                "player_id": p.player_id,
                "username": p.username,
                "total_score": p.total_score,
                "rounds_completed": len(p.guesses),
            }
            for p in sorted_players
        ],
        "current_round": game.current_round,
        "total_rounds": len(game.location_ids),
        "status": game.status,
    }
