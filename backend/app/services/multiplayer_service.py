"""multiplayer service: lobby lifecycle, matchmaking, and scoring."""

import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lobby import Lobby
from app.models.multiplayer_game import MultiplayerGame
from app.schemas.multiplayer import LobbyCreate, Player, PlayerGameState
from app.schemas.session import Guess, GuessSubmit
from app.services import location_service, session_service

MAX_PLAYERS = 4
ROUND_TIMEOUT_SECONDS = 20
# Once every active player has submitted, the round is force-advanced this many
# seconds later even if someone never sends "ready" (closed/idle tab), so one
# player can't strand the rest on the results screen. Kept under the client's
# results display so a player's own auto-advance reliably triggers it.
RESULTS_GRACE_SECONDS = 3
_SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _latest_guess_time(active_players: list[dict], round_index: int):
    """The most recent submit time among ``active_players`` for the given round,
    i.e. when the results screen began. Returns None if anyone hasn't submitted."""
    latest = None
    for p in active_players:
        guesses = p.get("guesses", [])
        if len(guesses) <= round_index:
            return None
        ts = guesses[round_index].get("timestamp")
        if not ts:
            continue
        try:
            dt = datetime.fromisoformat(ts)
        except (ValueError, TypeError):
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        if latest is None or dt > latest:
            latest = dt
    return latest


def _generate_lobby_code() -> str:
    return "".join(secrets.choice(_SAFE_CHARS) for _ in range(6))


async def create_lobby(data: LobbyCreate, host_username: str, db: AsyncSession) -> Optional[Lobby]:
    code = _generate_lobby_code()
    while (await db.execute(select(Lobby).where(Lobby.code == code))).scalar_one_or_none():
        code = _generate_lobby_code()

    host_id = str(uuid.uuid4())
    host = Player(
        id=host_id,
        username=host_username,
        is_host=True,
        ready=False,
        joined_at=datetime.now(timezone.utc),
    )
    lobby = Lobby(
        code=code,
        host_id=host_id,
        players=[host.model_dump(mode="json")],
        rounds=data.rounds,
        difficulty=data.difficulty,
        status="waiting",
        matchmaking=data.matchmaking,
        university=data.university,
        created_at=datetime.now(timezone.utc),
    )
    db.add(lobby)
    await db.commit()
    await db.refresh(lobby)
    return lobby


async def get_lobby(code: str, db: AsyncSession) -> Optional[Lobby]:
    result = await db.execute(select(Lobby).where(Lobby.code == code.upper()))
    return result.scalar_one_or_none()


async def join_lobby(code: str, username: str, db: AsyncSession) -> Optional[dict]:
    lobby = await get_lobby(code, db)
    if not lobby:
        return None
    if lobby.status != "waiting":
        return {"error": "Lobby is not accepting new players"}

    players = [Player(**p) for p in lobby.players]
    if any(p.username.lower() == username.lower() for p in players):
        return {"error": "Username already taken"}
    if len(players) >= MAX_PLAYERS:
        return {"error": "Lobby is full"}

    player_id = str(uuid.uuid4())
    new_player = Player(
        id=player_id,
        username=username,
        is_host=False,
        ready=False,
        joined_at=datetime.now(timezone.utc),
    )
    lobby.players = [p.model_dump(mode="json") for p in players] + [
        new_player.model_dump(mode="json")
    ]
    await db.commit()
    await db.refresh(lobby)
    return {"lobby": lobby, "player_id": player_id}


async def leave_lobby(code: str, player_id: str, db: AsyncSession) -> bool:
    lobby = await get_lobby(code, db)
    if not lobby:
        return False

    players = [Player(**p) for p in lobby.players]
    remaining = [p for p in players if p.id != player_id]

    if lobby.host_id == player_id and lobby.status == "waiting":
        if remaining:
            remaining[0] = Player(**{**remaining[0].model_dump(), "is_host": True})
            lobby.host_id = remaining[0].id
            lobby.players = [p.model_dump(mode="json") for p in remaining]
            await db.commit()
        else:
            await db.delete(lobby)
            await db.commit()
    else:
        lobby.players = [p.model_dump(mode="json") for p in remaining]
        await db.commit()
    return True


async def toggle_player_ready(code: str, player_id: str, db: AsyncSession) -> Optional[Lobby]:
    lobby = await get_lobby(code, db)
    if not lobby:
        return None

    players = [Player(**p) for p in lobby.players]
    lobby.players = [
        Player(**{**p.model_dump(), "ready": not p.ready}).model_dump(mode="json")
        if p.id == player_id
        else p.model_dump(mode="json")
        for p in players
    ]
    await db.commit()
    await db.refresh(lobby)
    return lobby


async def start_game(code: str, host_id: str, db: AsyncSession) -> Optional[MultiplayerGame]:
    lobby = await get_lobby(code, db)
    if not lobby:
        return None

    players = [Player(**p) for p in lobby.players]
    if lobby.host_id != host_id or len(players) < 2 or lobby.status != "waiting":
        return None

    locations = await location_service.get_random_locations(
        count=lobby.rounds, db=db, university=lobby.university
    )
    if len(locations) < lobby.rounds:
        return None

    now = datetime.now(timezone.utc)
    player_states = [
        PlayerGameState(
            player_id=p.id,
            username=p.username,
            guesses=[],
            total_score=0,
            ready_for_next_round=False,
            disconnected=False,
        ).model_dump(mode="json")
        for p in players
    ]

    game = MultiplayerGame(
        lobby_id=lobby.id,
        location_ids=[str(loc.id) for loc in locations],
        current_round=0,
        players=player_states,
        status="active",
        university=lobby.university,
        round_started_at=now,
        started_at=now,
    )
    db.add(game)
    lobby.status = "active"
    lobby.started_at = now
    await db.commit()
    await db.refresh(game)
    return game


async def get_game(
    game_id: str, db: AsyncSession, for_update: bool = False
) -> Optional[MultiplayerGame]:
    try:
        uid = uuid.UUID(game_id)
    except (ValueError, AttributeError):
        return None
    stmt = select(MultiplayerGame).where(MultiplayerGame.id == uid)
    if for_update:
        # Serialize concurrent read-modify-write on the players JSONB column so
        # near-simultaneous submits / ready calls don't clobber each other.
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_current_location(game_id: str, db: AsyncSession):
    game = await get_game(game_id, db)
    if not game or game.status != "active":
        return None
    if game.current_round >= len(game.location_ids):
        return None
    return await location_service.get_location(game.location_ids[game.current_round], db)


async def submit_guess(
    game_id: str, player_id: str, guess_submit: GuessSubmit, db: AsyncSession
) -> Optional[dict]:
    game = await get_game(game_id, db, for_update=True)
    if not game or game.status != "active":
        return None

    players = [PlayerGameState(**p) for p in game.players]
    player_state = next((ps for ps in players if ps.player_id == player_id), None)
    if not player_state or len(player_state.guesses) > game.current_round:
        return None

    location = await get_current_location(game_id, db)
    if not location:
        return None

    distance = session_service.calculate_distance(
        guess_submit.latitude, guess_submit.longitude,
        location.latitude, location.longitude,
    )
    base_points = session_service.calculate_points(distance)
    floor_bonus = session_service.calculate_floor_bonus(base_points, location.floor, guess_submit.floor)

    # Reward fast guesses with up to +50% of the base points, decaying to 0 by
    # the time the round times out.
    started = game.round_started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    speed_bonus = session_service.calculate_speed_bonus(
        base_points, elapsed, ROUND_TIMEOUT_SECONDS
    )

    total_points = base_points + floor_bonus + speed_bonus

    guess = Guess(
        location_id=str(location.id),
        guessed_latitude=guess_submit.latitude,
        guessed_longitude=guess_submit.longitude,
        actual_latitude=location.latitude,
        actual_longitude=location.longitude,
        distance_meters=distance,
        points=total_points,
        guessed_floor=guess_submit.floor,
        actual_floor=location.floor,
        floor_bonus=floor_bonus,
        speed_bonus=speed_bonus,
        timestamp=datetime.now(timezone.utc),
    )

    game.players = [
        {
            **ps.model_dump(mode="json"),
            "guesses": [g.model_dump(mode="json") for g in ps.guesses] + [guess.model_dump(mode="json")],
            "total_score": ps.total_score + total_points,
        }
        if ps.player_id == player_id
        else ps.model_dump(mode="json")
        for ps in players
    ]
    await db.commit()
    await db.refresh(game)

    refreshed = [PlayerGameState(**p) for p in game.players]
    all_submitted = all(
        len(ps.guesses) > game.current_round
        for ps in refreshed
        if not ps.disconnected
    )
    return {"guess": guess, "location": location, "all_submitted": all_submitted, "game": game}


async def mark_ready_for_next_round(
    game_id: str, player_id: str, db: AsyncSession
) -> Optional[MultiplayerGame]:
    # Lock the row for the whole read-modify-write so concurrent ready calls
    # serialize (each sees the others' flags) instead of clobbering each other.
    game = await get_game(game_id, db, for_update=True)
    if not game:
        return None

    players = [PlayerGameState(**p) for p in game.players]
    updated = [
        {**ps.model_dump(mode="json"), "ready_for_next_round": True}
        if ps.player_id == player_id
        else ps.model_dump(mode="json")
        for ps in players
    ]

    active = [p for p in updated if not p.get("disconnected")]
    all_ready = bool(active) and all(p["ready_for_next_round"] for p in active)

    # Failsafe: if every active player has already submitted a guess for this
    # round and the results have been shown longer than the grace period, advance
    # even if someone never sent "ready" (closed/idle tab) so the round can't
    # stall forever.
    force_advance = False
    if active and all(len(p["guesses"]) > game.current_round for p in active):
        completion = _latest_guess_time(active, game.current_round)
        if completion is not None:
            elapsed = (datetime.now(timezone.utc) - completion).total_seconds()
            force_advance = elapsed >= RESULTS_GRACE_SECONDS

    if (all_ready or force_advance) and game.current_round < len(game.location_ids) - 1:
        # Advance in the same locked transaction to avoid a double-advance gap.
        game.players = [{**p, "ready_for_next_round": False} for p in updated]
        game.current_round += 1
        game.round_started_at = datetime.now(timezone.utc)
    else:
        game.players = updated

    await db.commit()
    await db.refresh(game)
    return game


async def advance_round(game_id: str, db: AsyncSession) -> Optional[MultiplayerGame]:
    game = await get_game(game_id, db)
    if not game:
        return None

    new_round = game.current_round + 1
    is_complete = new_round >= len(game.location_ids)

    players = [PlayerGameState(**p) for p in game.players]
    game.players = [{**ps.model_dump(mode="json"), "ready_for_next_round": False} for ps in players]
    game.current_round = new_round
    game.round_started_at = datetime.now(timezone.utc)
    if is_complete:
        game.status = "completed"
        game.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(game)
    return game


async def handle_timeout(game_id: str, db: AsyncSession) -> Optional[MultiplayerGame]:
    game = await get_game(game_id, db)
    if not game or game.status != "active":
        return None

    elapsed = (datetime.now(timezone.utc) - game.round_started_at).total_seconds()
    if elapsed < ROUND_TIMEOUT_SECONDS:
        return None

    location = await get_current_location(game_id, db)
    if not location:
        return None

    players = [PlayerGameState(**p) for p in game.players]
    empty_guess = Guess(
        location_id=str(location.id),
        guessed_latitude=0.0,
        guessed_longitude=0.0,
        actual_latitude=location.latitude,
        actual_longitude=location.longitude,
        distance_meters=999999.0,
        points=0,
        guessed_floor=None,
        actual_floor=location.floor,
        floor_bonus=0,
        timestamp=datetime.now(timezone.utc),
    )

    updated = []
    for ps in players:
        pd = ps.model_dump(mode="json")
        if not ps.disconnected and len(ps.guesses) <= game.current_round:
            pd["guesses"] = pd["guesses"] + [empty_guess.model_dump(mode="json")]
            pd["disconnected"] = True
        updated.append(pd)
    game.players = updated
    await db.commit()
    return await advance_round(game_id, db)


async def mark_player_disconnected(game_id: str, player_id: str, db: AsyncSession) -> bool:
    game = await get_game(game_id, db)
    if not game:
        return False

    players = [PlayerGameState(**p) for p in game.players]
    if not any(ps.player_id == player_id for ps in players):
        return False

    game.players = [
        {**ps.model_dump(mode="json"), "disconnected": True}
        if ps.player_id == player_id
        else ps.model_dump(mode="json")
        for ps in players
    ]
    await db.commit()
    return True


async def find_matchmaking_lobby(
    rounds: int, difficulty: str, db: AsyncSession
) -> Optional[Lobby]:
    difficulty_str = difficulty.value if hasattr(difficulty, "value") else difficulty
    result = await db.execute(
        select(Lobby).where(
            Lobby.matchmaking.is_(True),
            Lobby.status == "waiting",
            Lobby.rounds == rounds,
            Lobby.difficulty == difficulty_str,
            func.jsonb_array_length(Lobby.players) < MAX_PLAYERS,
        )
    )
    return result.scalar_one_or_none()
