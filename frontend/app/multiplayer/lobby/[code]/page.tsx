"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { motion, AnimatePresence } from "framer-motion";
import { PixelButton } from "@/components/pixel-button";
import {
  getLobby,
  joinLobby,
  startGame,
  toggleReady,
  type Lobby,
  MultiplayerSocket,
} from "@/lib/multiplayer-api";
import { Users, Copy, Check, Crown, Loader2 } from "lucide-react";

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const lobbyCode = resolvedParams.code.toUpperCase();
  
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(
    searchParams.get("player_id")
  );
  const [username, setUsername] = useState<string>(
    searchParams.get("username") || ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  
  const socketRef = useRef<MultiplayerSocket | null>(null);
  const hasJoinedRef = useRef(false);

  // Initialize lobby
  useEffect(() => {
    // Prevent double joining in React strict mode
    if (hasJoinedRef.current) {
      return;
    }

    const initLobby = async () => {
      try {
        // If no player_id, try to join
        if (!playerId) {
          let usernameToUse = username;
          
          if (!usernameToUse) {
            // Prompt for username
            const input = prompt("Enter your username (3-20 characters):");
            if (!input || input.length < 3) {
              router.push("/multiplayer");
              return;
            }
            usernameToUse = input;
            setUsername(usernameToUse);
          }

          if (usernameToUse && !hasJoinedRef.current) {
            hasJoinedRef.current = true;
            const result = await joinLobby(lobbyCode, usernameToUse);
            setLobby(result.lobby);
            setPlayerId(result.player_id);
          }
        } else {
          // Already in lobby, just fetch
          const lobbyData = await getLobby(lobbyCode);
          setLobby(lobbyData);
        }
      } catch (err) {
        console.error("Lobby init error:", err);
        setError(err instanceof Error ? err.message : "Failed to load lobby");
        hasJoinedRef.current = false; // Reset on error so user can retry
      } finally {
        setLoading(false);
      }
    };

    initLobby();
  }, [lobbyCode, playerId, router]); // Removed username from deps to avoid re-triggering

  // WebSocket connection
  useEffect(() => {
    if (!playerId) return;
    
    // Prevent creating multiple sockets
    if (socketRef.current) return;

    const socket = new MultiplayerSocket();
    socket.connect();
    socket.joinLobby(lobbyCode, playerId);
    socketRef.current = socket;

    socket.on("lobby_updated", async () => {
      // Refresh lobby data
      try {
        const updatedLobby = await getLobby(lobbyCode);
        setLobby(updatedLobby);
      } catch (err) {
        console.error("Failed to refresh lobby:", err);
      }
    });

    socket.on("game_started", (data: { game_id: string }) => {
      router.push(`/multiplayer/game/${data.game_id}?player_id=${playerId}&username=${encodeURIComponent(username)}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [playerId, lobbyCode, username, router]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    if (!lobby || !playerId) {
      console.error("Cannot toggle ready: missing lobby or playerId");
      return;
    }
    
    try {
      console.log("Toggling ready for player:", playerId);
      const updatedLobby = await toggleReady(lobbyCode, playerId);
      setLobby(updatedLobby);
      // Also emit via WebSocket for real-time updates
      socketRef.current?.toggleReady(lobbyCode, playerId);
    } catch (err) {
      console.error("Toggle ready error:", err);
      setError(err instanceof Error ? err.message : "Failed to toggle ready");
    }
  };

  const handleStartGame = async () => {
    if (!lobby || !playerId) {
      console.error("Cannot start game: missing lobby or playerId");
      return;
    }
    
    if (lobby.host_id !== playerId) {
      setError("Only the host can start the game");
      return;
    }

    if (lobby.players.length < 2) {
      setError("Need at least 2 players to start");
      return;
    }

    setStarting(true);
    try {
      console.log("Starting game for lobby:", lobbyCode);
      const result = await startGame(lobbyCode, playerId);
      console.log("Game started, redirecting to:", result.game_id);
      router.push(`/multiplayer/game/${result.game_id}?player_id=${playerId}&username=${encodeURIComponent(username)}`);
    } catch (err) {
      console.error("Start game error:", err);
      setError(err instanceof Error ? err.message : "Failed to start game");
      setStarting(false);
    }
  };

  const handleLeave = () => {
    router.push("/multiplayer");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </main>
    );
  }

  if (error && !lobby) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardBody className="text-center space-y-4">
            <p className="text-red-600">{error}</p>
            <PixelButton onPress={() => router.push("/multiplayer")}>
              Back to Multiplayer
            </PixelButton>
          </CardBody>
        </Card>
      </main>
    );
  }

  if (!lobby) return null;

  const isHost = lobby.host_id === playerId;
  const currentPlayer = lobby.players.find((p) => p.id === playerId);
  const allReady = lobby.players.length >= 2 && lobby.players.every((p) => p.ready);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Lobby</h1>
          <div className="flex items-center justify-center gap-2">
            <code className="text-2xl font-mono font-bold bg-white px-4 py-2 rounded-lg border-2 border-indigo-200">
              {lobbyCode}
            </code>
            <button
              onClick={handleCopyCode}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check size={20} className="text-green-600" />
              ) : (
                <Copy size={20} className="text-slate-600" />
              )}
            </button>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="flex flex-col gap-2 pb-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-xl font-bold">
                  {lobby.matchmaking ? "Matchmaking" : "Private Lobby"}
                </h2>
                <p className="text-sm text-slate-600">
                  {lobby.rounds} rounds • {lobby.difficulty}
                </p>
              </div>
              <div className="flex items-center gap-1 text-slate-600">
                <Users size={20} />
                <span className="font-semibold">
                  {lobby.players.length}/{4}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardBody className="space-y-4">
            {/* Player list */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Players</h3>
              <div className="space-y-2">
                {lobby.players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                      player.id === playerId
                        ? "bg-indigo-50 border-indigo-300"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {player.is_host && (
                        <Crown size={16} className="text-yellow-500" />
                      )}
                      <span className="font-medium">{player.username}</span>
                      {player.id === playerId && (
                        <span className="text-xs text-slate-500">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {player.ready ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Ready
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          Not Ready
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100"
              >
                {error}
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {isHost ? (
                <>
                  <PixelButton
                    onPress={handleToggleReady}
                    variant="secondary"
                    className="flex-1"
                    isDisabled={!currentPlayer}
                  >
                    {currentPlayer?.ready ? "Not Ready" : "Ready"}
                  </PixelButton>
                  <PixelButton
                    onPress={handleStartGame}
                    isLoading={starting}
                    className="flex-1"
                    isDisabled={!allReady || lobby.players.length < 2}
                  >
                    Start Game
                  </PixelButton>
                </>
              ) : (
                <>
                  <PixelButton
                    onPress={handleToggleReady}
                    variant="secondary"
                    className="flex-1"
                    isDisabled={!currentPlayer}
                  >
                    {currentPlayer?.ready ? "Not Ready" : "Ready"}
                  </PixelButton>
                  <PixelButton
                    onPress={handleLeave}
                    variant="secondary"
                    className="flex-1"
                  >
                    Leave
                  </PixelButton>
                </>
              )}
            </div>

            {isHost && !allReady && lobby.players.length >= 2 && (
              <p className="text-xs text-center text-slate-500">
                All players must be ready to start
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
