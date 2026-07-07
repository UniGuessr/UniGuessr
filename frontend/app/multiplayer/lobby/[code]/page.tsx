"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@heroui/link";
import { motion, AnimatePresence } from "framer-motion";
import { PixelButton } from "@/components/Button/pixel-button";
import { useArcadeAudio } from "@/components/audio/arcade-audio";
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
  const audio = useArcadeAudio();

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
    
    audio?.playSelect();
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

    audio?.playStart();
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/60" size={32} />
      </div>
    );
  }

  if (error && !lobby) {
    return (
      <div className="relative z-10 min-h-[80vh] flex items-center justify-center px-4">
        <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
          {/* Card Background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/25 via-transparent to-zinc-950/45" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/45 via-zinc-950/15 to-transparent" />
            <div className="absolute inset-0 [background:radial-gradient(90%_60%_at_10%_70%,rgba(0,0,0,.55)_0%,transparent_70%)]" />
          </div>

          {/* Card Content */}
          <div className="relative z-10 p-8 space-y-6 text-center">
            <p className="text-red-400 font-mono uppercase tracking-wider text-sm">{error}</p>
            <PixelButton onClick={() => router.push("/multiplayer")} variant="secondary">
              Back to Multiplayer
            </PixelButton>
          </div>
        </div>
      </div>
    );
  }

  if (!lobby) return null;

  const isHost = lobby.host_id === playerId;
  const currentPlayer = lobby.players.find((p) => p.id === playerId);
  const allReady = lobby.players.length >= 2 && lobby.players.every((p) => p.ready);

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key="lobby"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative z-10 min-h-[80vh] flex items-center justify-center px-4"
        >
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm mt-15">
            {/* Card Background */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/25 via-transparent to-zinc-950/45" />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/45 via-zinc-950/15 to-transparent" />
              <div className="absolute inset-0 [background:radial-gradient(90%_60%_at_10%_70%,rgba(0,0,0,.55)_0%,transparent_70%)]" />
            </div>

            {/* Card Content */}
            <div className="relative z-10 p-8 space-y-6">
              {/* Header */}
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">Lobby</h1>
                
                {/* Lobby Code */}
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-mono font-bold bg-white/10 text-orange-500 px-4 py-2 rounded-lg border border-white/20">
                    {lobbyCode}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check size={20} className="text-green-400" />
                    ) : (
                      <Copy size={20} className="text-white/60" />
                    )}
                  </button>
                </div>
              </div>

              {/* Lobby Info */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    {lobby.matchmaking ? "Matchmaking" : "Private Lobby"}
                  </h2>
                  <p className="text-xs text-white/40 font-mono uppercase tracking-wider">
                    {lobby.rounds} rounds • {lobby.difficulty}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-white/60">
                  <Users size={18} />
                  <span className="font-semibold font-mono">
                    {lobby.players.length}/4
                  </span>
                </div>
              </div>

              {/* Player list */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-white/40">Players</h3>
                <div className="space-y-2">
                  {lobby.players.map((player) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        player.id === playerId
                          ? "bg-orange-500/10 border-orange-500/30"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {player.is_host && (
                          <Crown size={16} className="text-yellow-500" />
                        )}
                        <span className="font-medium text-white font-mono uppercase tracking-wider text-sm">{player.username}</span>
                        {player.id === playerId && (
                          <span className="text-xs text-white/40 font-mono">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {player.ready ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-mono uppercase tracking-wider">
                            Ready
                          </span>
                        ) : (
                          <span className="text-xs bg-white/10 text-white/40 px-2 py-1 rounded font-mono uppercase tracking-wider">
                            Not Ready
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs font-mono uppercase tracking-wider text-red-400"
                >
                  {error}
                </motion.p>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  {isHost ? (
                    <>
                      <PixelButton
                        onClick={handleToggleReady}
                        variant="secondary"
                        className="flex-1"
                        disabled={!currentPlayer}
                      >
                        {currentPlayer?.ready ? "Not Ready" : "Ready"}
                      </PixelButton>
                      <PixelButton
                        onClick={handleStartGame}
                        isLoading={starting}
                        className="flex-1"
                        variant="secondary"
                        disabled={!allReady || lobby.players.length < 2}
                      >
                        Start Game
                      </PixelButton>
                    </>
                  ) : (
                    <>
                      <PixelButton
                        onClick={handleToggleReady}
                        variant="secondary"
                        className="flex-1"
                        disabled={!currentPlayer}
                      >
                        {currentPlayer?.ready ? "Not Ready" : "Ready"}
                      </PixelButton>
                      <PixelButton
                        onClick={handleLeave}
                        variant="secondary"
                        className="flex-1"
                      >
                        Leave
                      </PixelButton>
                    </>
                  )}
                </div>

                {isHost && !allReady && lobby.players.length >= 2 && (
                  <p className="text-xs text-center text-white/40 font-mono uppercase tracking-wider">
                    All players must be ready to start
                  </p>
                )}

                <Link
                  href="/multiplayer"
                  className="flex items-center justify-center gap-2 py-2 text-orange-500 text-xs font-mono uppercase tracking-wider hover:text-orange-400 transition-colors"
                >
                  ← Back
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
