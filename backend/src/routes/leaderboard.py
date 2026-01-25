from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.database import get_db
from src.models.leaderboard import (
    LeaderboardEntryCreate,
    LeaderboardEntryResponse,
)
from src.services.leaderboard_service import LeaderboardService

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


def get_leaderboard_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> LeaderboardService:
    """Dependency to get leaderboard service."""
    return LeaderboardService(db)


@router.post("", response_model=dict, status_code=201)
async def create_leaderboard_entry(
    entry: LeaderboardEntryCreate,
    service: LeaderboardService = Depends(get_leaderboard_service)
):
    """
    Create a new leaderboard entry.
    
    Args:
        entry: Leaderboard entry data (username, score, rounds, difficulty)
        service: Leaderboard service dependency
    
    Returns:
        Created entry ID and message
    """
    # Validate difficulty
    valid_difficulties = ["easy", "normal", "hard"]
    if entry.difficulty not in valid_difficulties:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
        )
    
    entry_id = await service.create_entry(entry)
    return {
        "id": entry_id,
        "message": "Score saved to leaderboard successfully"
    }


@router.get("", response_model=List[LeaderboardEntryResponse])
async def get_leaderboard(
    limit: int = Query(default=100, ge=1, le=500, description="Maximum number of entries to return"),
    rounds: Optional[int] = Query(default=None, ge=1, description="Filter by number of rounds"),
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty (easy, normal, hard)"),
    service: LeaderboardService = Depends(get_leaderboard_service)
):
    """
    Get top scores from the leaderboard.
    
    Query parameters:
        - limit: Maximum number of entries (default: 100, max: 500)
        - rounds: Filter by number of rounds (optional)
        - difficulty: Filter by difficulty level (optional)
    
    Returns:
        List of leaderboard entries with ranks, sorted by score
    """
    # Validate difficulty if provided
    if difficulty is not None:
        valid_difficulties = ["easy", "normal", "hard"]
        if difficulty not in valid_difficulties:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
            )
    
    entries = await service.get_top_scores(
        limit=limit,
        rounds=rounds,
        difficulty=difficulty
    )
    
    # Add ranks to entries
    responses = []
    for rank, entry in enumerate(entries, start=1):
        entry_dict = entry.model_dump()
        entry_dict["rank"] = rank
        responses.append(LeaderboardEntryResponse(**entry_dict))
    
    return responses


@router.get("/user/{username}/rank", response_model=dict)
async def get_user_rank(
    username: str,
    rounds: Optional[int] = Query(default=None, ge=1, description="Filter by number of rounds"),
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty"),
    service: LeaderboardService = Depends(get_leaderboard_service)
):
    """
    Get the rank of a specific user.
    
    Args:
        username: Username to get rank for
        rounds: Filter by number of rounds (optional)
        difficulty: Filter by difficulty level (optional)
    
    Returns:
        User's rank and total entries count
    """
    # Validate difficulty if provided
    if difficulty is not None:
        valid_difficulties = ["easy", "normal", "hard"]
        if difficulty not in valid_difficulties:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
            )
    
    rank = await service.get_user_rank(
        username=username,
        rounds=rounds,
        difficulty=difficulty
    )
    
    if rank is None:
        raise HTTPException(
            status_code=404,
            detail="User not found on leaderboard"
        )
    
    total_entries = await service.count_entries(
        rounds=rounds,
        difficulty=difficulty
    )
    
    return {
        "username": username,
        "rank": rank,
        "total_entries": total_entries
    }


@router.get("/count", response_model=dict)
async def count_leaderboard_entries(
    rounds: Optional[int] = Query(default=None, ge=1, description="Filter by number of rounds"),
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty"),
    service: LeaderboardService = Depends(get_leaderboard_service)
):
    """
    Get total count of leaderboard entries.
    
    Query parameters:
        - rounds: Filter by number of rounds (optional)
        - difficulty: Filter by difficulty level (optional)
    
    Returns:
        Total count of entries
    """
    count = await service.count_entries(
        rounds=rounds,
        difficulty=difficulty
    )
    return {"count": count}
