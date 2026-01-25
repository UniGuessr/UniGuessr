import socketio
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict

from src.database import get_db
from src.services.multiplayer_service import MultiplayerService

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="asgi"
)

# Store active connections: {lobby_id or game_id: {player_id: sid}}
active_connections: Dict[str, Dict[str, str]] = {}


def get_multiplayer_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> MultiplayerService:
    """Dependency to get multiplayer service."""
    return MultiplayerService(db)


@sio.event
async def connect(sid, environ):
    """Handle client connection."""
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    """Handle client disconnect."""
    print(f"Client disconnected: {sid}")
    # Remove from active connections
    for room_id, players in active_connections.items():
        if sid in players.values():
            player_id = next(k for k, v in players.items() if v == sid)
            del players[player_id]
            # Notify others in room
            await sio.emit("player_disconnected", {"player_id": player_id}, room=room_id, skip_sid=sid)
            break


@sio.event
async def join_lobby(sid, data):
    """Join a lobby room."""
    lobby_code = data.get("lobby_code")
    player_id = data.get("player_id")
    
    if not lobby_code or not player_id:
        await sio.emit("error", {"message": "Missing lobby_code or player_id"}, room=sid)
        return
    
    room = f"lobby_{lobby_code}"
    await sio.enter_room(sid, room)
    
    if lobby_code not in active_connections:
        active_connections[lobby_code] = {}
    active_connections[lobby_code][player_id] = sid
    
    # Notify others
    await sio.emit("lobby_updated", {"message": "Player joined"}, room=room, skip_sid=sid)
    await sio.emit("joined_lobby", {"lobby_code": lobby_code}, room=sid)


@sio.event
async def leave_lobby(sid, data):
    """Leave a lobby room."""
    lobby_code = data.get("lobby_code")
    player_id = data.get("player_id")
    
    if lobby_code:
        room = f"lobby_{lobby_code}"
        await sio.leave_room(sid, room)
        
        if lobby_code in active_connections and player_id in active_connections[lobby_code]:
            del active_connections[lobby_code][player_id]
        
        await sio.emit("lobby_updated", {"message": "Player left"}, room=room, skip_sid=sid)


@sio.event
async def player_ready(sid, data):
    """Toggle player ready status."""
    lobby_code = data.get("lobby_code")
    player_id = data.get("player_id")
    
    if not lobby_code or not player_id:
        await sio.emit("error", {"message": "Missing lobby_code or player_id"}, room=sid)
        return
    
    # This will be handled by REST endpoint, then emit update
    room = f"lobby_{lobby_code}"
    await sio.emit("lobby_updated", {"message": "Player ready status changed"}, room=room)


@sio.event
async def join_game(sid, data):
    """Join a game room."""
    game_id = data.get("game_id")
    player_id = data.get("player_id")
    
    if not game_id or not player_id:
        await sio.emit("error", {"message": "Missing game_id or player_id"}, room=sid)
        return
    
    room = f"game_{game_id}"
    await sio.enter_room(sid, room)
    
    if game_id not in active_connections:
        active_connections[game_id] = {}
    active_connections[game_id][player_id] = sid
    
    await sio.emit("joined_game", {"game_id": game_id}, room=sid)


@sio.event
async def leave_game(sid, data):
    """Leave a game room."""
    game_id = data.get("game_id")
    player_id = data.get("player_id")
    
    if game_id:
        room = f"game_{game_id}"
        await sio.leave_room(sid, room)
        
        if game_id in active_connections and player_id in active_connections[game_id]:
            del active_connections[game_id][player_id]
        
        await sio.emit("player_disconnected", {"player_id": player_id}, room=room, skip_sid=sid)


@sio.event
async def ping(sid, data):
    """Ping/pong for keepalive."""
    await sio.emit("pong", {}, room=sid)


# Helper functions to emit events
async def emit_lobby_update(lobby_code: str, data: dict):
    """Emit lobby update to all clients in lobby."""
    room = f"lobby_{lobby_code}"
    await sio.emit("lobby_updated", data, room=room)


async def emit_game_started(lobby_code: str, game_id: str):
    """Emit game started event to all clients in lobby."""
    room = f"lobby_{lobby_code}"
    await sio.emit("game_started", {"game_id": game_id}, room=room)


async def emit_game_update(game_id: str, event: str, data: dict):
    """Emit game update to all clients in game."""
    room = f"game_{game_id}"
    await sio.emit(event, data, room=room)


# Export socket app for mounting
socket_app = socketio.ASGIApp(sio)
