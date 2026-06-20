from typing import Dict

import socketio

sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode="asgi")
socket_app = socketio.ASGIApp(sio)

# {room_id: {player_id: sid}}
active_connections: Dict[str, Dict[str, str]] = {}


@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    for room_id, players in list(active_connections.items()):
        if sid in players.values():
            player_id = next(k for k, v in players.items() if v == sid)
            del players[player_id]
            await sio.emit("player_disconnected", {"player_id": player_id}, room=room_id, skip_sid=sid)
            break


@sio.event
async def join_lobby(sid, data):
    lobby_code = data.get("lobby_code")
    player_id = data.get("player_id")
    if not lobby_code or not player_id:
        await sio.emit("error", {"message": "Missing lobby_code or player_id"}, room=sid)
        return

    room = f"lobby_{lobby_code}"
    await sio.enter_room(sid, room)
    active_connections.setdefault(lobby_code, {})[player_id] = sid
    await sio.emit("lobby_updated", {"message": "Player joined"}, room=room, skip_sid=sid)
    await sio.emit("joined_lobby", {"lobby_code": lobby_code}, room=sid)


@sio.event
async def leave_lobby(sid, data):
    lobby_code = data.get("lobby_code")
    player_id = data.get("player_id")
    if lobby_code:
        room = f"lobby_{lobby_code}"
        await sio.leave_room(sid, room)
        active_connections.get(lobby_code, {}).pop(player_id, None)
        await sio.emit("lobby_updated", {"message": "Player left"}, room=room, skip_sid=sid)


@sio.event
async def player_ready(sid, data):
    lobby_code = data.get("lobby_code")
    if not lobby_code or not data.get("player_id"):
        await sio.emit("error", {"message": "Missing lobby_code or player_id"}, room=sid)
        return
    await sio.emit("lobby_updated", {"message": "Player ready status changed"}, room=f"lobby_{lobby_code}")


@sio.event
async def join_game(sid, data):
    game_id = data.get("game_id")
    player_id = data.get("player_id")
    if not game_id or not player_id:
        await sio.emit("error", {"message": "Missing game_id or player_id"}, room=sid)
        return

    room = f"game_{game_id}"
    await sio.enter_room(sid, room)
    active_connections.setdefault(game_id, {})[player_id] = sid
    await sio.emit("joined_game", {"game_id": game_id}, room=sid)


@sio.event
async def leave_game(sid, data):
    game_id = data.get("game_id")
    player_id = data.get("player_id")
    if game_id:
        room = f"game_{game_id}"
        await sio.leave_room(sid, room)
        active_connections.get(game_id, {}).pop(player_id, None)
        await sio.emit("player_disconnected", {"player_id": player_id}, room=room, skip_sid=sid)


@sio.event
async def ping(sid, data):
    await sio.emit("pong", {}, room=sid)


async def emit_lobby_update(lobby_code: str, data: dict):
    await sio.emit("lobby_updated", data, room=f"lobby_{lobby_code}")


async def emit_game_started(lobby_code: str, game_id: str):
    await sio.emit("game_started", {"game_id": game_id}, room=f"lobby_{lobby_code}")


async def emit_game_update(game_id: str, event: str, data: dict):
    await sio.emit(event, data, room=f"game_{game_id}")
