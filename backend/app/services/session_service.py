"""session service: game logic, scoring, and guess evaluation."""

import uuid
from datetime import datetime, timezone
from math import atan2, cos, exp, radians, sin, sqrt
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game_session import GameSession
from app.schemas.session import Guess, GuessSubmit, SessionCreate
from app.services import location_service


async def create_session(data: SessionCreate, db: AsyncSession) -> Optional[GameSession]:
    locations = await location_service.get_random_locations(
        count=data.rounds, db=db, university=data.university
    )
    if len(locations) < data.rounds:
        return None

    session = GameSession(
        rounds=data.rounds,
        difficulty=data.difficulty,
        location_ids=[str(loc.id) for loc in locations],
        current_round=0,
        guesses=[],
        total_score=0,
        status="active",
        university=data.university,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(session_id: str, db: AsyncSession) -> Optional[GameSession]:
    try:
        uid = uuid.UUID(session_id)
    except (ValueError, AttributeError):
        return None
    result = await db.execute(select(GameSession).where(GameSession.id == uid))
    return result.scalar_one_or_none()


async def get_current_location(session_id: str, db: AsyncSession):
    session = await get_session(session_id, db)
    if not session or session.status != "active":
        return None
    if session.current_round >= session.rounds:
        return None
    return await location_service.get_location(session.location_ids[session.current_round], db)


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000
    lat1_r, lat2_r = radians(lat1), radians(lat2)
    d_lat, d_lon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(lat1_r) * cos(lat2_r) * sin(d_lon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def calculate_points(distance_meters: float) -> int:
    return max(0, round(1000 * exp(-distance_meters / 200)))


def calculate_floor_bonus(base_points: int, actual_floor, guessed_floor: Optional[int]) -> int:
    if actual_floor is None or actual_floor == "":
        return 0
    if guessed_floor is None:
        return 0
    try:
        actual = int(actual_floor) if isinstance(actual_floor, str) else actual_floor
        return int(base_points * 0.20) if actual == guessed_floor else 0
    except (ValueError, TypeError):
        return 0


async def submit_guess(
    session_id: str, guess_submit: GuessSubmit, db: AsyncSession
) -> Optional[dict]:
    session = await get_session(session_id, db)
    if not session or session.status != "active":
        return None
    if session.current_round >= session.rounds:
        return None

    location = await get_current_location(session_id, db)
    if not location:
        return None

    distance = calculate_distance(
        guess_submit.latitude, guess_submit.longitude,
        location.latitude, location.longitude,
    )
    base_points = calculate_points(distance)
    floor_bonus = calculate_floor_bonus(base_points, location.floor, guess_submit.floor)
    total_points = base_points + floor_bonus

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
        timestamp=datetime.now(timezone.utc),
    )

    new_round = session.current_round + 1
    new_status = "completed" if new_round >= session.rounds else "active"

    session.guesses = [*session.guesses, guess.model_dump(mode="json")]
    session.total_score = session.total_score + total_points
    session.current_round = new_round
    session.status = new_status
    if new_status == "completed":
        session.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(session)

    return {
        "guess": guess,
        "location": location,
        "round_complete": True,
        "game_complete": new_status == "completed",
        "current_round": new_round,
        "total_score": session.total_score,
    }
