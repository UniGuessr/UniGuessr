"""leaderboard api: crud and filtering for high scores."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.leaderboard import LeaderboardEntryCreate, LeaderboardEntryResponse
from app.services import leaderboard_service

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

_VALID_DIFFICULTIES = {"easy", "normal", "hard"}


def _validate_difficulty(difficulty: Optional[str]) -> None:
    if difficulty is not None and difficulty not in _VALID_DIFFICULTIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty. Must be one of: {', '.join(sorted(_VALID_DIFFICULTIES))}",
        )


@router.post("", response_model=dict, status_code=201)
async def create_leaderboard_entry(
    entry: LeaderboardEntryCreate, db: AsyncSession = Depends(get_db)
):
    _validate_difficulty(entry.difficulty)
    entry_id = await leaderboard_service.create_entry(entry, db)
    return {"id": entry_id, "message": "Score saved to leaderboard successfully"}


@router.get("", response_model=List[LeaderboardEntryResponse])
async def get_leaderboard(
    limit: int = Query(default=100, ge=1, le=500),
    rounds: Optional[int] = Query(default=None, ge=1),
    difficulty: Optional[str] = Query(default=None),
    university: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    _validate_difficulty(difficulty)
    entries = await leaderboard_service.get_top_scores(
        db, limit=limit, rounds=rounds, difficulty=difficulty, university=university
    )
    return [
        LeaderboardEntryResponse.model_validate({**e.__dict__, "rank": rank})
        for rank, e in enumerate(entries, start=1)
    ]


@router.get("/highlights", response_model=dict)
async def get_leaderboard_highlights(
    top: int = Query(default=5, ge=1, le=20),
    recent: int = Query(default=3, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Top scores and most recent scores for the home-page ticker."""
    top_entries = await leaderboard_service.get_top_scores_overall(db, limit=top)
    recent_entries = await leaderboard_service.get_recent_scores(db, limit=recent)
    return {
        "top": [
            LeaderboardEntryResponse.model_validate({**e.__dict__, "rank": rank})
            for rank, e in enumerate(top_entries, start=1)
        ],
        "recent": [
            LeaderboardEntryResponse.model_validate(e.__dict__) for e in recent_entries
        ],
    }


@router.get("/user/{username}/rank", response_model=dict)
async def get_user_rank(
    username: str,
    rounds: Optional[int] = Query(default=None, ge=1),
    difficulty: Optional[str] = Query(default=None),
    university: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    _validate_difficulty(difficulty)
    rank = await leaderboard_service.get_user_rank(
        username, db, rounds=rounds, difficulty=difficulty, university=university
    )
    if rank is None:
        raise HTTPException(status_code=404, detail="User not found on leaderboard")
    total = await leaderboard_service.count_entries(
        db, rounds=rounds, difficulty=difficulty, university=university
    )
    return {"username": username, "rank": rank, "total_entries": total}


@router.get("/count", response_model=dict)
async def count_leaderboard_entries(
    rounds: Optional[int] = Query(default=None, ge=1),
    difficulty: Optional[str] = Query(default=None),
    university: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    _validate_difficulty(difficulty)
    count = await leaderboard_service.count_entries(
        db, rounds=rounds, difficulty=difficulty, university=university
    )
    return {"count": count}
