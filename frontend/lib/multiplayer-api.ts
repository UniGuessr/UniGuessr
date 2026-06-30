import { io, Socket } from "socket.io-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types
export interface Lobby {
  _id: string;
  code: string;
  host_id: string;
  players: Player[];
  rounds: number;
  difficulty: string;
  status: "waiting" | "starting" | "active" | "completed";
  matchmaking: boolean;
  created_at: string;
  started_at: string | null;
}

export interface Player {
  id: string;
  username: string;
  joined_at: string;
  is_host: boolean;
  ready: boolean;
}

export interface MultiplayerGame {
  _id: string;
  lobby_id: string;
  location_ids: string[];
  current_round: number;
  players: PlayerGameState[];
  status: "active" | "completed";
  university?: "concordia" | "mcgill" | null;
  round_started_at: string;
  started_at: string;
  completed_at: string | null;
}

export interface PlayerGameState {
  player_id: string;
  username: string;
  guesses: any[]; // Guess[]
  total_score: number;
  ready_for_next_round: boolean;
  disconnected: boolean;
}

export interface LeaderboardEntry {
  player_id: string;
  username: string;
  total_score: number;
  rounds_completed: number;
}

// REST API functions
export async function createLobby(
  rounds: number,
  difficulty: "easy" | "normal" | "hard",
  hostUsername: string,
  matchmaking: boolean = false
): Promise<{ lobby_id: string; code: string; host_id: string; lobby: Lobby }> {
  const response = await fetch(
    `${API_BASE_URL}/api/multiplayer/lobbies?host_username=${encodeURIComponent(hostUsername)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rounds,
        difficulty,
        matchmaking,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create lobby");
  }

  return await response.json();
}

export async function getLobby(code: string): Promise<Lobby> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/lobbies/${code}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get lobby");
  }
  return response.json();
}

export async function joinLobby(
  code: string,
  username: string
): Promise<{ lobby: Lobby; player_id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/lobbies/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to join lobby");
  }

  return response.json();
}

export async function toggleReady(code: string, playerId: string): Promise<Lobby> {
  const response = await fetch(
    `${API_BASE_URL}/api/multiplayer/lobbies/${code}/ready?player_id=${encodeURIComponent(playerId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to toggle ready");
  }

  return response.json();
}

export async function leaveLobby(code: string, playerId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/lobbies/${code}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to leave lobby");
  }
}

export async function startGame(
  code: string,
  hostId: string
): Promise<{ game_id: string; game: MultiplayerGame }> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/lobbies/${code}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host_id: hostId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to start game");
  }

  return response.json();
}

export async function joinMatchmaking(
  username: string,
  rounds: number,
  difficulty: "easy" | "normal" | "hard"
): Promise<{ lobby_id: string; code: string; host_id: string; player_id: string; lobby: Lobby }> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/matchmaking/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, rounds, difficulty }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to join matchmaking");
  }

  return response.json();
}

export async function getGame(gameId: string): Promise<MultiplayerGame> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/games/${gameId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get game");
  }
  return response.json();
}

export async function getCurrentLocation(gameId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/games/${gameId}/current-location`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get current location");
  }
  return response.json();
}

export async function submitGuess(
  gameId: string,
  playerId: string,
  latitude: number,
  longitude: number,
  floor?: number | null
): Promise<any> {
  const body: any = {
    player_id: playerId,
    latitude,
    longitude,
  };
  
  if (floor !== null && floor !== undefined) {
    body.floor = floor;
  }

  const response = await fetch(`${API_BASE_URL}/api/multiplayer/games/${gameId}/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to submit guess");
  }

  return response.json();
}

export async function markReadyNextRound(
  gameId: string,
  playerId: string
): Promise<MultiplayerGame> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/games/${gameId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to mark ready");
  }

  return response.json();
}

export async function getLeaderboard(gameId: string): Promise<{
  players: LeaderboardEntry[];
  current_round: number;
  total_rounds: number;
  status: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/multiplayer/games/${gameId}/leaderboard`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get leaderboard");
  }
  return response.json();
}

// WebSocket client
export class MultiplayerSocket {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(): void {
    this.socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("Connected to multiplayer server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from multiplayer server");
    });

    // Register all listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  joinLobby(lobbyCode: string, playerId: string): void {
    this.emit("join_lobby", { lobby_code: lobbyCode, player_id: playerId });
  }

  leaveLobby(lobbyCode: string, playerId: string): void {
    this.emit("leave_lobby", { lobby_code: lobbyCode, player_id: playerId });
  }

  joinGame(gameId: string, playerId: string): void {
    this.emit("join_game", { game_id: gameId, player_id: playerId });
  }

  leaveGame(gameId: string, playerId: string): void {
    this.emit("leave_game", { game_id: gameId, player_id: playerId });
  }

  toggleReady(lobbyCode: string, playerId: string): void {
    this.emit("player_ready", { lobby_code: lobbyCode, player_id: playerId });
  }

  sendCursor(
    gameId: string,
    playerId: string,
    lat: number,
    lng: number,
    username: string
  ): void {
    this.emit("cursor_move", {
      game_id: gameId,
      player_id: playerId,
      username,
      lat,
      lng,
    });
  }

  ping(): void {
    this.emit("ping", {});
  }
}
