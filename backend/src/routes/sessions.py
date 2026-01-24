from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.database import get_db
from src.models.session import SessionCreate, SessionResponse, GuessSubmit
from src.services.session_service import SessionService

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def get_session_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> SessionService:
    """Dependency to get session service."""
    return SessionService(db)


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    session_create: SessionCreate,
    service: SessionService = Depends(get_session_service)
):
    """Create a new game session.
    
    Args:
        rounds: Number of rounds to play (1-20, default: 5)
        difficulty: Game difficulty level - "easy", "normal", or "hard" (default: "easy")
    
    Returns:
        Session object with randomly selected location IDs
    """
    session = await service.create_session(session_create)
    if not session:
        raise HTTPException(
            status_code=400,
            detail="Not enough locations available to create a session"
        )
    return SessionResponse(**session.model_dump())


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    service: SessionService = Depends(get_session_service)
):
    """Get session details."""
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(**session.model_dump())


@router.get("/{session_id}/current-location", response_model=dict)
async def get_current_location(
    session_id: str,
    service: SessionService = Depends(get_session_service)
):
    """Get the current location for the session (without revealing coordinates)."""
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")
    
    if session.current_round >= session.rounds:
        raise HTTPException(status_code=400, detail="No more rounds available")
    
    location = await service.get_current_location(session_id)
    if not location:
        raise HTTPException(status_code=404, detail="Current location not found")
    
    # Return location without coordinates (player shouldn't see them yet)
    return {
        "location_id": location.id,
        "image_url": location.image_url,
        "name": location.name,
        "round": session.current_round + 1,
        "total_rounds": session.rounds
    }


@router.post("/{session_id}/guess", response_model=dict)
async def submit_guess(
    session_id: str,
    guess: GuessSubmit,
    service: SessionService = Depends(get_session_service)
):
    """Submit a guess for the current round."""
    result = await service.submit_guess(session_id, guess)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Cannot submit guess. Session may be inactive or completed."
        )
    
    return {
        "distance_meters": result["guess"].distance_meters,
        "points": result["guess"].points,
        "actual_location": {
            "latitude": result["location"].latitude,
            "longitude": result["location"].longitude,
            "name": result["location"].name
        },
        "guessed_location": {
            "latitude": result["guess"].guessed_latitude,
            "longitude": result["guess"].guessed_longitude
        },
        "round_complete": result["round_complete"],
        "game_complete": result["game_complete"],
        "current_round": result["current_round"],
        "total_score": result["total_score"]
    }
