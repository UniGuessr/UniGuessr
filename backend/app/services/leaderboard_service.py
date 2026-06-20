"""leaderboard service: query and rank high scores by filter."""

import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.leaderboard import LeaderboardEntry
from app.schemas.leaderboard import LeaderboardEntryCreate


async def create_entry(data: LeaderboardEntryCreate, db: AsyncSession) -> str:
    entry = LeaderboardEntry(**data.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return str(entry.id)


async def get_top_scores(
    db: AsyncSession,
    limit: int = 100,
    rounds: Optional[int] = None,
    difficulty: Optional[str] = None,
    university: Optional[str] = None,
) -> list[LeaderboardEntry]:
    query = select(LeaderboardEntry).order_by(LeaderboardEntry.score.desc()).limit(limit)
    if rounds is not None:
        query = query.where(LeaderboardEntry.rounds == rounds)
    if difficulty is not None:
        query = query.where(LeaderboardEntry.difficulty == difficulty)
    if university is not None:
        query = query.where(LeaderboardEntry.university == university)
    else:
        query = query.where(LeaderboardEntry.university.is_(None))
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_user_rank(
    username: str,
    db: AsyncSession,
    rounds: Optional[int] = None,
    difficulty: Optional[str] = None,
    university: Optional[str] = None,
) -> Optional[int]:
    best_q = (
        select(LeaderboardEntry)
        .where(LeaderboardEntry.username == username)
        .order_by(LeaderboardEntry.score.desc())
        .limit(1)
    )
    if rounds is not None:
        best_q = best_q.where(LeaderboardEntry.rounds == rounds)
    if difficulty is not None:
        best_q = best_q.where(LeaderboardEntry.difficulty == difficulty)
    if university is not None:
        best_q = best_q.where(LeaderboardEntry.university == university)
    else:
        best_q = best_q.where(LeaderboardEntry.university.is_(None))

    entry = (await db.execute(best_q)).scalar_one_or_none()
    if not entry:
        return None

    count_q = select(func.count()).select_from(LeaderboardEntry).where(
        LeaderboardEntry.score > entry.score
    )
    if rounds is not None:
        count_q = count_q.where(LeaderboardEntry.rounds == rounds)
    if difficulty is not None:
        count_q = count_q.where(LeaderboardEntry.difficulty == difficulty)
    if university is not None:
        count_q = count_q.where(LeaderboardEntry.university == university)
    else:
        count_q = count_q.where(LeaderboardEntry.university.is_(None))

    return (await db.execute(count_q)).scalar_one() + 1


async def count_entries(
    db: AsyncSession,
    rounds: Optional[int] = None,
    difficulty: Optional[str] = None,
    university: Optional[str] = None,
) -> int:
    query = select(func.count()).select_from(LeaderboardEntry)
    if rounds is not None:
        query = query.where(LeaderboardEntry.rounds == rounds)
    if difficulty is not None:
        query = query.where(LeaderboardEntry.difficulty == difficulty)
    if university is not None:
        query = query.where(LeaderboardEntry.university == university)
    else:
        query = query.where(LeaderboardEntry.university.is_(None))
    return (await db.execute(query)).scalar_one()
