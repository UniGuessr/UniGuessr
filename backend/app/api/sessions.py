"""sessions api: create single-player game sessions and submit guesses."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.session import GuessSubmit, SessionCreate, SessionResponse
from app.services import session_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = await session_service.create_session(data, db)
    if not session:
        raise HTTPException(
            status_code=400, detail="Not enough locations available to create a session"
        )
    return SessionResponse.model_validate(session)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await session_service.get_session(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.model_validate(session)


@router.get("/{session_id}/current-location", response_model=dict)
async def get_current_location(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await session_service.get_session(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")
    if session.current_round >= session.rounds:
        raise HTTPException(status_code=400, detail="No more rounds available")

    location = await session_service.get_current_location(session_id, db)
    if not location:
        raise HTTPException(status_code=404, detail="Current location not found")

    return {
        "location_id": str(location.id),
        "image_url": location.image_url,
        "name": location.name,
        "building_id": location.building_id,
        "round": session.current_round + 1,
        "total_rounds": session.rounds,
    }


@router.post("/{session_id}/guess", response_model=dict)
async def submit_guess(session_id: str, guess: GuessSubmit, db: AsyncSession = Depends(get_db)):
    result = await session_service.submit_guess(session_id, guess, db)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit guess. Session may be inactive or completed.",
        )
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
        "round_complete": result["round_complete"],
        "game_complete": result["game_complete"],
        "current_round": result["current_round"],
        "total_score": result["total_score"],
    }
