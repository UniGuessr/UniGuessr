import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.models.multiplayer import (
    Lobby, LobbyCreate, LobbyJoin, MultiplayerGame, Player, PlayerGameState
)
from src.models.session import Guess, GuessSubmit
from src.services.location_service import LocationService
from src.services.session_service import SessionService


class MultiplayerService:
    """Service for managing multiplayer lobbies and games."""
    
    MAX_PLAYERS = 4
    ROUND_TIMEOUT_SECONDS = 20
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.lobby_collection = db.lobbies
        self.game_collection = db.multiplayer_games
        self.location_service = LocationService(db)
        self.session_service = SessionService(db)  # Reuse scoring logic
    
    def _generate_lobby_code(self) -> str:
        """Generate a unique 6-character lobby code without ambiguous characters."""
        # Exclude ambiguous characters: 0/O, 1/I/l, and potentially confusing pairs
        safe_chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        while True:
            code = ''.join(secrets.choice(safe_chars) for _ in range(6))
            # Check if code exists (we'll do this async in create_lobby)
            return code
    
    async def create_lobby(self, lobby_create: LobbyCreate, host_username: str) -> Optional[Lobby]:
        """Create a new lobby."""
        # Generate unique code
        code = self._generate_lobby_code()
        # Ensure code is unique
        existing = await self.lobby_collection.find_one({"code": code})
        while existing:
            code = self._generate_lobby_code()
            existing = await self.lobby_collection.find_one({"code": code})
        
        # Create host player
        host_id = str(ObjectId())
        host = Player(
            id=host_id,
            username=host_username,
            is_host=True,
            ready=False
        )
        
        lobby_dict = {
            "code": code,
            "host_id": host_id,
            "players": [host.model_dump()],
            "rounds": lobby_create.rounds,
            "difficulty": lobby_create.difficulty,
            "status": "waiting",
            "matchmaking": lobby_create.matchmaking,
            "created_at": datetime.utcnow(),
            "started_at": None
        }
        
        result = await self.lobby_collection.insert_one(lobby_dict)
        lobby_dict["_id"] = str(result.inserted_id)
        return Lobby(**lobby_dict)
    
    async def get_lobby(self, code: str) -> Optional[Lobby]:
        """Get lobby by code."""
        lobby = await self.lobby_collection.find_one({"code": code.upper()})
        if lobby:
            lobby["_id"] = str(lobby["_id"])
            return Lobby(**lobby)
        return None
    
    async def join_lobby(self, code: str, username: str) -> Optional[dict]:
        """Join a lobby. Returns lobby and player_id."""
        lobby = await self.get_lobby(code)
        if not lobby:
            return None
        
        if lobby.status != "waiting":
            return {"error": "Lobby is not accepting new players"}
        
        # Check if username already taken in this lobby
        if any(p.username.lower() == username.lower() for p in lobby.players):
            return {"error": "Username already taken"}
        
        # Check if lobby is full
        if len(lobby.players) >= self.MAX_PLAYERS:
            return {"error": "Lobby is full"}
        
        # Create new player
        player_id = str(ObjectId())
        new_player = Player(
            id=player_id,
            username=username,
            is_host=False,
            ready=False
        )
        
        # Add player to lobby
        await self.lobby_collection.update_one(
            {"code": code.upper()},
            {"$push": {"players": new_player.model_dump()}}
        )
        
        # Return updated lobby
        updated_lobby = await self.get_lobby(code)
        return {
            "lobby": updated_lobby,
            "player_id": player_id
        }
    
    async def leave_lobby(self, code: str, player_id: str) -> bool:
        """Leave a lobby."""
        lobby = await self.get_lobby(code)
        if not lobby:
            return False
        
        # Remove player
        await self.lobby_collection.update_one(
            {"code": code.upper()},
            {"$pull": {"players": {"id": player_id}}}
        )
        
        # If host left and lobby not started, assign new host or delete lobby
        if lobby.host_id == player_id and lobby.status == "waiting":
            updated_lobby = await self.get_lobby(code)
            if updated_lobby and len(updated_lobby.players) > 0:
                # Assign new host (first player)
                new_host_id = updated_lobby.players[0].id
                await self.lobby_collection.update_one(
                    {"code": code.upper()},
                    {"$set": {"host_id": new_host_id, "players.$[elem].is_host": True}},
                    array_filters=[{"elem.id": new_host_id}]
                )
            elif updated_lobby and len(updated_lobby.players) == 0:
                # Delete empty lobby
                await self.lobby_collection.delete_one({"code": code.upper()})
        
        return True
    
    async def toggle_player_ready(self, code: str, player_id: str) -> Optional[Lobby]:
        """Toggle player ready status."""
        lobby = await self.get_lobby(code)
        if not lobby:
            return None
        
        # Find player and toggle ready
        for player in lobby.players:
            if player.id == player_id:
                new_ready = not player.ready
                await self.lobby_collection.update_one(
                    {"code": code.upper(), "players.id": player_id},
                    {"$set": {"players.$.ready": new_ready}}
                )
                return await self.get_lobby(code)
        
        return None
    
    async def start_game(self, code: str, host_id: str) -> Optional[MultiplayerGame]:
        """Start a game from a lobby."""
        lobby = await self.get_lobby(code)
        if not lobby:
            return None
        
        if lobby.host_id != host_id:
            return None  # Only host can start
        
        if len(lobby.players) < 2:
            return None  # Need at least 2 players
        
        if lobby.status != "waiting":
            return None  # Already started
        
        # Get random locations
        locations = await self.location_service.get_random_locations(
            count=lobby.rounds,
            difficulty=None
        )
        
        if len(locations) < lobby.rounds:
            return None  # Not enough locations
        
        # Create player game states
        player_states = [
            PlayerGameState(
                player_id=p.id,
                username=p.username,
                guesses=[],
                total_score=0,
                ready_for_next_round=False,
                disconnected=False
            )
            for p in lobby.players
        ]
        
        # Create multiplayer game
        game_dict = {
            "lobby_id": str(lobby.id),
            "location_ids": [loc.id for loc in locations],
            "current_round": 0,
            "players": [ps.model_dump() for ps in player_states],
            "status": "active",
            "round_started_at": datetime.utcnow(),
            "started_at": datetime.utcnow(),
            "completed_at": None
        }
        
        result = await self.game_collection.insert_one(game_dict)
        game_dict["_id"] = str(result.inserted_id)
        
        # Update lobby status
        await self.lobby_collection.update_one(
            {"code": code.upper()},
            {"$set": {"status": "active", "started_at": datetime.utcnow()}}
        )
        
        return MultiplayerGame(**game_dict)
    
    async def get_game(self, game_id: str) -> Optional[MultiplayerGame]:
        """Get multiplayer game by ID."""
        if not ObjectId.is_valid(game_id):
            return None
        
        game = await self.game_collection.find_one({"_id": ObjectId(game_id)})
        if game:
            game["_id"] = str(game["_id"])
            return MultiplayerGame(**game)
        return None
    
    async def get_current_location(self, game_id: str):
        """Get current location for the game (same for all players)."""
        game = await self.get_game(game_id)
        if not game or game.status != "active":
            return None
        
        if game.current_round >= len(game.location_ids):
            return None
        
        location_id = game.location_ids[game.current_round]
        return await self.location_service.get_location(location_id)
    
    async def submit_guess(
        self, game_id: str, player_id: str, guess_submit: GuessSubmit
    ) -> Optional[dict]:
        """Submit a guess for a player in multiplayer game."""
        game = await self.get_game(game_id)
        if not game or game.status != "active":
            return None
        
        # Find player state
        player_state = None
        for ps in game.players:
            if ps.player_id == player_id:
                player_state = ps
                break
        
        if not player_state:
            return None
        
        # Check if player already submitted for this round
        if len(player_state.guesses) > game.current_round:
            return None  # Already submitted
        
        # Get current location
        location = await self.get_current_location(game_id)
        if not location:
            return None
        
        # Calculate distance and points (reuse SessionService logic)
        distance = self.session_service.calculate_distance(
            guess_submit.latitude,
            guess_submit.longitude,
            location.latitude,
            location.longitude
        )
        base_points = self.session_service.calculate_points(distance)
        
        # Calculate floor bonus
        floor_bonus = self.session_service.calculate_floor_bonus(
            base_points,
            location.floor,
            guess_submit.floor
        )
        
        total_points = base_points + floor_bonus
        
        # Create guess
        guess = Guess(
            location_id=location.id,
            guessed_latitude=guess_submit.latitude,
            guessed_longitude=guess_submit.longitude,
            actual_latitude=location.latitude,
            actual_longitude=location.longitude,
            distance_meters=distance,
            points=total_points,
            guessed_floor=guess_submit.floor,
            actual_floor=location.floor,
            floor_bonus=floor_bonus,
            timestamp=datetime.utcnow()
        )
        
        # Update player's guess and score
        player_state.guesses.append(guess)
        player_state.total_score += total_points
        
        # Update game in database
        await self.game_collection.update_one(
            {"_id": ObjectId(game_id), "players.player_id": player_id},
            {
                "$push": {"players.$.guesses": guess.model_dump()},
                "$inc": {"players.$.total_score": total_points}
            }
        )
        
        # Check if all players submitted
        updated_game = await self.get_game(game_id)
        all_submitted = all(
            len(ps.guesses) > updated_game.current_round
            for ps in updated_game.players
            if not ps.disconnected
        )
        
        return {
            "guess": guess,
            "location": location,
            "all_submitted": all_submitted,
            "game": updated_game
        }
    
    async def mark_ready_for_next_round(self, game_id: str, player_id: str) -> Optional[MultiplayerGame]:
        """Mark player as ready for next round."""
        game = await self.get_game(game_id)
        if not game:
            return None
        
        # Update player ready status
        await self.game_collection.update_one(
            {"_id": ObjectId(game_id), "players.player_id": player_id},
            {"$set": {"players.$.ready_for_next_round": True}}
        )
        
        updated_game = await self.get_game(game_id)
        
        # Check if all players ready
        all_ready = all(
            ps.ready_for_next_round
            for ps in updated_game.players
            if not ps.disconnected
        )
        
        if all_ready and updated_game.current_round < len(updated_game.location_ids) - 1:
            # Advance to next round
            await self.advance_round(game_id)
            updated_game = await self.get_game(game_id)
        
        return updated_game
    
    async def advance_round(self, game_id: str) -> Optional[MultiplayerGame]:
        """Advance to next round."""
        game = await self.get_game(game_id)
        if not game:
            return None
        
        new_round = game.current_round + 1
        is_complete = new_round >= len(game.location_ids)
        
        update_data = {
            "current_round": new_round,
            "round_started_at": datetime.utcnow()
        }
        
        # Reset ready status for all players
        for ps in game.players:
            await self.game_collection.update_one(
                {"_id": ObjectId(game_id), "players.player_id": ps.player_id},
                {"$set": {"players.$.ready_for_next_round": False}}
            )
        
        if is_complete:
            update_data["status"] = "completed"
            update_data["completed_at"] = datetime.utcnow()
        
        await self.game_collection.update_one(
            {"_id": ObjectId(game_id)},
            {"$set": update_data}
        )
        
        return await self.get_game(game_id)
    
    async def handle_timeout(self, game_id: str) -> Optional[MultiplayerGame]:
        """Handle round timeout - auto-submit empty guesses for missing players."""
        game = await self.get_game(game_id)
        if not game or game.status != "active":
            return None
        
        # Check if timeout occurred
        elapsed = (datetime.utcnow() - game.round_started_at).total_seconds()
        if elapsed < self.ROUND_TIMEOUT_SECONDS:
            return None  # Not timed out yet
        
        # Get current location
        location = await self.get_current_location(game_id)
        if not location:
            return None
        
        # Auto-submit for players who haven't submitted
        for ps in game.players:
            if ps.disconnected:
                continue
            
            if len(ps.guesses) <= game.current_round:
                # Player hasn't submitted - create 0-point guess
                empty_guess = Guess(
                    location_id=location.id,
                    guessed_latitude=0.0,
                    guessed_longitude=0.0,
                    actual_latitude=location.latitude,
                    actual_longitude=location.longitude,
                    distance_meters=999999.0,
                    points=0,
                    guessed_floor=None,
                    actual_floor=location.floor,
                    floor_bonus=0,
                    timestamp=datetime.utcnow()
                )
                
                await self.game_collection.update_one(
                    {"_id": ObjectId(game_id), "players.player_id": ps.player_id},
                    {
                        "$push": {"players.$.guesses": empty_guess.model_dump()},
                        "$set": {"players.$.disconnected": True}
                    }
                )
        
        # Advance round
        return await self.advance_round(game_id)
    
    async def mark_player_disconnected(self, game_id: str, player_id: str) -> bool:
        """Mark a player as disconnected."""
        result = await self.game_collection.update_one(
            {"_id": ObjectId(game_id), "players.player_id": player_id},
            {"$set": {"players.$.disconnected": True}}
        )
        return result.modified_count > 0
    
    async def find_matchmaking_lobby(
        self, rounds: int, difficulty: str
    ) -> Optional[Lobby]:
        """Find a matchmaking lobby with matching criteria."""
        lobby = await self.lobby_collection.find_one({
            "matchmaking": True,
            "status": "waiting",
            "rounds": rounds,
            "difficulty": difficulty.value if hasattr(difficulty, 'value') else difficulty,
            "$expr": {"$lt": [{"$size": "$players"}, self.MAX_PLAYERS]}
        })
        
        if lobby:
            lobby["_id"] = str(lobby["_id"])
            return Lobby(**lobby)
        return None
