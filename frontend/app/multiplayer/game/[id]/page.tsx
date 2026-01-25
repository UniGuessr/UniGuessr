"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Link } from "@heroui/link";
import { motion, AnimatePresence } from "framer-motion";
import GuessMap from "@/components/guess-map";
import { PixelButton } from "@/components/pixel-button";
import FloorSelector from "@/components/floor-selector";
import { findNearbyBuilding, type Building } from "@/config/buildings";
import {
  getGame,
  getCurrentLocation,
  submitGuess,
  markReadyNextRound,
  getLeaderboard,
  type MultiplayerGame,
  MultiplayerSocket,
} from "@/lib/multiplayer-api";
import { Loader2, Users, Trophy } from "lucide-react";

type GameState = "loading" | "playing" | "waiting_results" | "results" | "finished";

const ROUND_TIMEOUT_SECONDS = 20;

export default function MultiplayerGamePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;
  const playerId = searchParams.get("player_id");
  const username = searchParams.get("username") || "";

  const [gameState, setGameState] = useState<GameState>("loading");
  const [game, setGame] = useState<MultiplayerGame | null>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [guessResult, setGuessResult] = useState<any>(null);
  const [selectedGuess, setSelectedGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);

  // Floor selection
  const [nearbyBuilding, setNearbyBuilding] = useState<Building | null>(null);
  const [showFloorSelector, setShowFloorSelector] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(ROUND_TIMEOUT_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<MultiplayerSocket | null>(null);
  const currentRoundRef = useRef<number>(0);

  // Initialize game
  useEffect(() => {
    if (!playerId) {
      router.push("/multiplayer");
      return;
    }

    const initGame = async () => {
      try {
        const gameData = await getGame(gameId);
        setGame(gameData);
        
        if (gameData.status === "completed") {
          const leaderboardData = await getLeaderboard(gameId);
          setLeaderboard(leaderboardData);
          setGameState("finished");
          return;
        }

        const location = await getCurrentLocation(gameId);
        setCurrentLocation(location);
        currentRoundRef.current = gameData.current_round;
        setGameState("playing");
        startTimer();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load game");
      }
    };

    initGame();
  }, [gameId, playerId, router]);

  // WebSocket connection
  useEffect(() => {
    if (!gameId || !playerId) return;

    const socket = new MultiplayerSocket();
    socket.connect();
    socket.joinGame(gameId, playerId);
    socketRef.current = socket;

    socket.on("round_started", async () => {
      const gameData = await getGame(gameId);
      setGame(gameData);
      currentRoundRef.current = gameData.current_round;
      const location = await getCurrentLocation(gameId);
      setCurrentLocation(location);
      setGameState("playing");
      setGuessResult(null);
      setSelectedGuess(null);
      startTimer();
    });

    socket.on("guess_submitted", async () => {
      // Refresh game state
      const gameData = await getGame(gameId);
      setGame(gameData);
    });

    socket.on("round_complete", async () => {
      clearTimer();
      const gameData = await getGame(gameId);
      setGame(gameData);
      setGameState("waiting_results");
      // Transition to results after a short delay
      setTimeout(() => {
        setGameState("results");
      }, 1000);
    });

    socket.on("game_complete", async () => {
      const leaderboardData = await getLeaderboard(gameId);
      setLeaderboard(leaderboardData);
      setGameState("finished");
    });

    return () => {
      socket.disconnect();
    };
  }, [gameId, playerId]);

  // Poll game state periodically
  useEffect(() => {
    if (gameState === "finished") return;

    const interval = setInterval(async () => {
      try {
        const gameData = await getGame(gameId);
        setGame(gameData);

        if (gameData.status === "completed") {
          const leaderboardData = await getLeaderboard(gameId);
          setLeaderboard(leaderboardData);
          setGameState("finished");
          return;
        }

        // Detect round change (fallback if WebSocket misses the event)
        if (gameData.current_round > currentRoundRef.current) {
          currentRoundRef.current = gameData.current_round;
          const location = await getCurrentLocation(gameId);
          setCurrentLocation(location);
          setGameState("playing");
          setGuessResult(null);
          setSelectedGuess(null);
          startTimer();
        }

        // Detect if all players submitted (fallback to transition to results)
        if (gameState === "waiting_results" || gameState === "playing") {
          const allSubmitted = gameData.players.every(
            (p: any) => !p.disconnected && p.guesses.length > gameData.current_round
          );
          if (allSubmitted && gameState !== "results") {
            console.log("All players submitted - transitioning to results");
            setGameState("results");
          }
        }

        // Auto-transition to finished if on final round and all players completed
        if (gameState === "results" && gameData.current_round >= gameData.location_ids.length - 1) {
          const allCompleted = gameData.players.every(
            (p: any) => !p.disconnected && p.guesses.length >= gameData.location_ids.length
          );
          if (allCompleted) {
            console.log("All players completed final round - fetching leaderboard");
            const leaderboardData = await getLeaderboard(gameId);
            setLeaderboard(leaderboardData);
            // Don't auto-transition, let user click the button to see results
          }
        }
      } catch (err) {
        console.error("Failed to refresh game:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameId, gameState]);

  const startTimer = () => {
    setTimeRemaining(ROUND_TIMEOUT_SECONDS);
    clearTimer();
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimeout = async () => {
    // Auto-submit empty guess if not submitted
    if (selectedGuess && gameState === "playing") {
      await finalizeGuessSubmission(null);
    }
  };

  const handleGuessSelect = useCallback((lat: number, lng: number) => {
    setSelectedGuess({ lat, lng });
    
    const building = findNearbyBuilding(lat, lng);
    if (building) {
      setNearbyBuilding(building);
      setShowFloorSelector(true);
    } else {
      setNearbyBuilding(null);
      setShowFloorSelector(false);
      setSelectedFloor(null);
    }
  }, []);

  const submitCurrentGuess = async () => {
    if (!selectedGuess) return;
    await finalizeGuessSubmission(selectedFloor);
  };

  const finalizeGuessSubmission = async (floor: number | null) => {
    if (!selectedGuess) return;

    setLoading(true);
    setError(null);
    clearTimer();

    try {
      const result = await submitGuess(gameId, playerId!, selectedGuess.lat, selectedGuess.lng, floor);
      setGuessResult(result);
      
      const gameData = await getGame(gameId);
      setGame(gameData);

      if (result.all_submitted) {
        setGameState("waiting_results");
        // Wait a bit then show results
        setTimeout(() => {
          setGameState("results");
        }, 1000);
      } else {
        setGameState("waiting_results");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guess");
    } finally {
      setLoading(false);
      setShowFloorSelector(false);
      setSelectedFloor(null);
      setNearbyBuilding(null);
    }
  };

  const [readyingUp, setReadyingUp] = useState(false);

  const handleNextRound = async () => {
    if (!game) return;

    setReadyingUp(true);
    try {
      const updatedGame = await markReadyNextRound(gameId, playerId!);
      setGame(updatedGame);
      // Round will advance automatically when all players ready
      // WebSocket will notify us
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance round");
    } finally {
      setReadyingUp(false);
    }
  };

  const getCurrentPlayerState = () => {
    if (!game || !playerId) return null;
    return game.players.find((p) => p.player_id === playerId);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  // Auto-transition to waiting_results if player has submitted but state is still "playing"
  // This handles edge cases where state transition failed
  useEffect(() => {
    if (!game || !currentLocation) return;
    
    const currentPlayerState = game.players.find((p) => p.player_id === playerId);
    const playerHasSubmitted = !!(currentPlayerState && currentPlayerState.guesses.length > game.current_round);
    
    if (playerHasSubmitted && gameState === "playing") {
      console.log("Player has submitted but state is still playing - transitioning to waiting_results");
      setGameState("waiting_results");
      clearTimer();
      // If we don't have guess result yet, create one from the player's last guess
      if (!guessResult && currentPlayerState && currentPlayerState.guesses.length > 0) {
        const lastGuess = currentPlayerState.guesses[currentPlayerState.guesses.length - 1];
        setGuessResult({
          points: lastGuess.points,
          distance_meters: lastGuess.distance_meters,
          floor_bonus: lastGuess.floor_bonus || 0,
          actual_location: {
            latitude: lastGuess.actual_latitude,
            longitude: lastGuess.actual_longitude,
            name: currentLocation?.name || "Unknown Location",
          },
          guessed_location: {
            latitude: lastGuess.guessed_latitude,
            longitude: lastGuess.guessed_longitude,
          },
        });
      }
    }
  }, [game, currentLocation, playerId, gameState, guessResult]);

  if (gameState === "loading") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/60" size={32} />
      </div>
    );
  }

  if (gameState === "finished" && leaderboard) {
    const currentPlayer = getCurrentPlayerState();
    const rank = leaderboard.players.findIndex((p: any) => p.player_id === playerId) + 1;
    const isWinner = rank === 1;
    const totalRounds = leaderboard.total_rounds || game?.location_ids?.length || 0;

    // Position indicators
    const getPositionDisplay = (index: number) => {
      if (index === 0) return { icon: <Trophy className="text-yellow-400" size={20} />, color: "text-yellow-400" };
      if (index === 1) return { icon: <span className="text-lg">2nd</span>, color: "text-gray-300" };
      if (index === 2) return { icon: <span className="text-lg">3rd</span>, color: "text-amber-600" };
      return { icon: <span className="text-sm">#{index + 1}</span>, color: "text-white/40" };
    };

    return (
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key="finished"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative z-10 min-h-[80vh] flex items-center justify-center px-4"
          >
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
              {/* Card Background */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/25 via-transparent to-zinc-950/45" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/45 via-zinc-950/15 to-transparent" />
                <div className="absolute inset-0 [background:radial-gradient(90%_60%_at_10%_70%,rgba(0,0,0,.55)_0%,transparent_70%)]" />
              </div>

              {/* Card Content */}
              <div className="relative z-10 p-8 space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="text-center space-y-2"
                >
                  {isWinner ? (
                    <>
                      <motion.div
                        initial={{ rotate: -10, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", delay: 0.3 }}
                      >
                        <Trophy className="mx-auto text-yellow-400 mb-2" size={48} />
                      </motion.div>
                      <h1 className="text-2xl font-bold text-yellow-400 font-mono uppercase tracking-wider">Victory!</h1>
                      <p className="text-xs text-white/50 font-mono uppercase tracking-wider">You won the game!</p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">Game Complete!</h1>
                      <p className="text-xs text-white/50 font-mono uppercase tracking-wider">Final Leaderboard</p>
                    </>
                  )}
                </motion.div>

                {/* Game Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center gap-6 text-center"
                >
                  <div>
                    <p className="text-2xl font-bold text-orange-500 font-mono">{totalRounds}</p>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Rounds</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-500 font-mono">{leaderboard.players.length}</p>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Players</p>
                  </div>
                </motion.div>

                {/* Leaderboard */}
                <div className="space-y-2">
                  {leaderboard.players.map((player: any, index: number) => {
                    const isCurrentPlayer = player.player_id === playerId;
                    const position = getPositionDisplay(index);
                    return (
                      <motion.div
                        key={player.player_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          index === 0
                            ? "bg-yellow-500/10 border-yellow-500/30"
                            : isCurrentPlayer
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 font-bold font-mono flex items-center justify-center ${position.color}`}>
                            {position.icon}
                          </div>
                          <div>
                            <div className="font-bold text-white font-mono uppercase tracking-wider text-sm">
                              {player.username}
                              {isCurrentPlayer && (
                                <span className="text-xs text-white/40 ml-2">(You)</span>
                              )}
                            </div>
                            <div className="text-xs text-white/40 font-mono uppercase tracking-wider">
                              {player.rounds_completed} rounds completed
                            </div>
                          </div>
                        </div>
                        <div className={`text-xl font-bold font-mono ${index === 0 ? "text-yellow-400" : "text-orange-500"}`}>
                          {player.total_score.toLocaleString()}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Your Score Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-center py-4 border-t border-white/10"
                >
                  <p className="text-xs text-white/40 mb-2 font-mono uppercase tracking-wider">
                    Your Final Score
                  </p>
                  <p className={`text-4xl font-bold font-mono ${isWinner ? "text-yellow-400" : "text-orange-500"}`}>
                    {currentPlayer?.total_score.toLocaleString() || 0}
                  </p>
                  <p className="text-white/40 mt-2 text-sm font-mono uppercase tracking-wider">
                    {isWinner ? "1st Place" : `Rank #${rank}`}
                  </p>
                </motion.div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <PixelButton
                    onClick={() => router.push("/multiplayer")}
                    className="w-full"
                    size="lg"
                    variant="secondary"
                  >
                    Play Again
                  </PixelButton>
                  <Link
                    href="/"
                    className="flex items-center justify-center gap-2 py-2 text-orange-500 text-xs font-mono uppercase tracking-wider hover:text-orange-400 transition-colors"
                  >
                    ← Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (!game || !currentLocation) return null;

  const currentPlayer = getCurrentPlayerState();
  const hasSubmitted = !!(currentPlayer && currentPlayer.guesses.length > game.current_round);

  return (
    <div>
      <AnimatePresence mode="wait">
        {gameState === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-[calc(100vh-8rem)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-xs font-mono uppercase tracking-wider">
                  Round {currentLocation.round} / {currentLocation.total_rounds}
                </span>
                <span className="text-orange-500 font-medium text-xs font-mono uppercase tracking-wider">
                  Score: {(currentPlayer?.total_score || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10">
                  <span className={`font-bold font-mono ${timeRemaining <= 5 ? "text-red-500" : "text-orange-500"}`}>
                    {timeRemaining}s
                  </span>
                </div>
                <PixelButton variant="danger" size="sm" onClick={() => router.push("/multiplayer")}>
                  Leave
                </PixelButton>
              </div>
            </div>

            {/* Timer Bar */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 relative">
                {/* Outer glow */}
                <div
                  className="absolute -inset-1 rounded-full opacity-60 blur-md transition-all duration-300"
                  style={{
                    background: `linear-gradient(90deg, 
                      rgba(249, 115, 22, ${0.3 + (timeRemaining / ROUND_TIMEOUT_SECONDS) * 0.5}) 0%, 
                      rgba(249, 115, 22, ${0.4 + (timeRemaining / ROUND_TIMEOUT_SECONDS) * 0.4}) ${(timeRemaining / ROUND_TIMEOUT_SECONDS) * 100}%, 
                      transparent ${(timeRemaining / ROUND_TIMEOUT_SECONDS) * 100}%)`,
                  }}
                />
                {/* Main bar background */}
                <div className="relative h-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden">
                  {/* Progress bar */}
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeRemaining / ROUND_TIMEOUT_SECONDS) * 100}%` }}
                    transition={{ duration: 0.5, ease: "linear" }}
                    style={{
                      background: timeRemaining <= 5 
                        ? `linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)`
                        : `linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)`,
                      boxShadow: timeRemaining <= 5
                        ? `0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)`
                        : `0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
                    }}
                  >
                    {/* Trailing particle */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full animate-pulse"
                      style={{
                        background: "radial-gradient(circle, #fff 0%, transparent 70%)",
                        boxShadow: timeRemaining <= 5
                          ? `0 0 10px #fff, 0 0 20px rgba(220, 38, 38, 0.8), 0 0 30px rgba(248, 113, 113, 0.6)`
                          : `0 0 10px #fff, 0 0 20px rgba(249, 115, 22, 0.8), 0 0 30px rgba(251, 146, 60, 0.6)`,
                      }}
                    />
                  </motion.div>
                </div>
              </div>
              <span className={`text-sm font-mono font-bold min-w-[40px] text-right ${timeRemaining <= 5 ? 'text-red-500' : 'text-orange-500'}`}>
                {timeRemaining}s
              </span>
            </div>

            {/* Main game area */}
            <div className="relative h-[calc(100%-5rem)] overflow-hidden flex gap-4">
              {/* Location image */}
              <motion.div
                initial={{ opacity: 0, width: "100%" }}
                animate={{ 
                  opacity: 1,
                  width: "49%",
                }}
                transition={{ 
                  opacity: { duration: 0.5 },
                  width: { duration: 0.8, ease: "easeInOut" },
                }}
                className="h-full z-10 flex-shrink-0"
              >
                <Card className="overflow-hidden h-full w-full bg-transparent border-none shadow-none">
                  <CardBody className="p-0 h-full flex items-center justify-center bg-transparent">
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={currentLocation.image_url}
                        alt="Where is this?"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          console.error("Image failed to load:", currentLocation.image_url);
                          e.currentTarget.src = "https://via.placeholder.com/800x600?text=Image+Not+Found";
                        }}
                        onLoad={() => {
                          console.log("Image loaded successfully:", currentLocation.image_url);
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 from-black/70 p-4 font-mono uppercase tracking-wider">
                        <p className="text-white text-lg font-semibold font-mono uppercase tracking-wider">Where is this location?</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>

              {/* Map for guessing */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full w-1/2 flex-shrink-0"
              >
                <div className="flex flex-col h-full w-full overflow-hidden relative">
                  <div className="flex-1 min-h-0 overflow-hidden relative">
                    <GuessMap
                      onGuess={handleGuessSelect}
                      disabled={hasSubmitted || loading}
                    />
                    {/* Floor selector */}
                    {showFloorSelector && nearbyBuilding && (
                      <div className="absolute top-4 right-4 z-50">
                        <FloorSelector
                          building={nearbyBuilding}
                          selectedFloor={selectedFloor}
                          onFloorSelect={setSelectedFloor}
                        />
                      </div>
                    )}
                  </div>
                  <PixelButton
                    size="lg"
                    className="flex-shrink-0 w-full"
                    onClick={submitCurrentGuess}
                    disabled={!selectedGuess || hasSubmitted}
                    isLoading={loading}
                    variant="secondary"
                  >
                    {hasSubmitted ? "Waiting for others..." : selectedGuess ? "Submit Guess" : "Place your marker on the map"}
                  </PixelButton>
                  {error && (
                    <div className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono uppercase tracking-wider flex-shrink-0">
                      {error}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {(gameState === "waiting_results" || gameState === "results") && guessResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-[calc(100vh-3rem)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-xs font-mono uppercase tracking-wider">
                Round {currentLocation.round} / {currentLocation.total_rounds}
              </span>
              <span className="text-orange-500 font-medium font-mono uppercase tracking-wider">
                Total Score: {(currentPlayer?.total_score || 0).toLocaleString()}
              </span>
            </div>

            {/* Result content */}
            <div className="flex gap-4 h-[calc(100%-4rem)]">
              {/* Score card */}
              <div className="w-1/2 h-full">
                <Card className="bg-gradient-to-br from-slate-50 to-white h-full">
                  <CardBody className="flex flex-col items-center justify-center gap-6 p-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="text-center w-full"
                    >
                      <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mb-2">
                        You scored
                      </p>
                      <div className="flex items-baseline justify-center gap-2">
                        <p className="text-6xl font-bold text-orange-500 font-mono">
                          {(guessResult.points - (guessResult.floor_bonus || 0)).toLocaleString()}
                        </p>
                        {guessResult.floor_bonus > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                            className="flex flex-col items-start"
                          >
                            <p className="text-2xl font-bold text-purple-600 leading-none font-mono">
                              +{guessResult.floor_bonus}
                            </p>
                            <p className="text-[10px] text-purple-500 font-mono uppercase tracking-wider">
                              Floor
                            </p>
                          </motion.div>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1 font-mono uppercase tracking-wider">
                        Total: {guessResult.points.toLocaleString()} points
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-center"
                    >
                      <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">Distance from actual location</p>
                      <p className="text-2xl font-semibold text-slate-700 font-mono">
                        {formatDistance(guessResult.distance_meters)}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="w-full p-4 bg-emerald-50 rounded-xl border border-emerald-200"
                    >
                      <p className="text-emerald-600 text-xs font-mono uppercase tracking-wider mb-1">Actual Location</p>
                      <p className="text-emerald-800 font-semibold text-sm font-mono uppercase tracking-wider">
                        {guessResult.actual_location.name}
                      </p>
                    </motion.div>

                    {/* Player Ready Status - show on non-final rounds */}
                    {game.current_round < game.location_ids.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="w-full space-y-2"
                      >
                        <p className="text-slate-500 text-xs font-mono uppercase tracking-wider text-center">Players Ready</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {game.players.map((player) => {
                            const isReady = player.ready_for_next_round;
                            const isCurrentPlayer = player.player_id === playerId;
                            return (
                              <div
                                key={player.player_id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all ${
                                  isReady
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {isReady ? (
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                ) : (
                                  <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                                )}
                                <span>{player.username}{isCurrentPlayer ? " (You)" : ""}</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {gameState === "waiting_results" && game.current_round < game.location_ids.length - 1 && (
                      <div className="text-center py-2">
                        <p className="text-slate-500 font-mono uppercase tracking-wider text-xs">Waiting for all players to submit...</p>
                      </div>
                    )}

                    {gameState === "waiting_results" && game.current_round >= game.location_ids.length - 1 && (
                      <div className="text-center py-4">
                        <Loader2 className="animate-spin mx-auto mb-2 text-orange-500" size={24} />
                        <p className="text-slate-600 font-mono uppercase tracking-wider text-xs">Final round complete! Waiting for other players...</p>
                      </div>
                    )}

                    {gameState === "results" && game.current_round < game.location_ids.length - 1 && (
                      <PixelButton
                        onClick={handleNextRound}
                        size="lg"
                        className="w-full mt-4"
                        variant="secondary"
                        isLoading={readyingUp}
                        disabled={currentPlayer?.ready_for_next_round}
                      >
                        {currentPlayer?.ready_for_next_round ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                            Ready! Waiting for others...
                          </>
                        ) : (
                          "Next Round →"
                        )}
                      </PixelButton>
                    )}

                    {gameState === "results" && game.current_round >= game.location_ids.length - 1 && (
                      <PixelButton
                        onClick={async () => {
                          // Fetch leaderboard and show final results
                          try {
                            const leaderboardData = await getLeaderboard(gameId);
                            setLeaderboard(leaderboardData);
                            setGameState("finished");
                          } catch (err) {
                            console.error("Failed to fetch leaderboard:", err);
                            // Fallback: just go to finished state
                            setGameState("finished");
                          }
                        }}
                        size="lg"
                        className="w-full mt-4"
                        variant="secondary"
                      >
                        <Trophy className="mr-2" size={20} />
                        See Final Results
                      </PixelButton>
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* Map showing result */}
              <div className="w-1/2 h-full">
                <GuessMap
                  onGuess={() => {}}
                  disabled
                  showResult
                  guessedLocation={
                    selectedGuess
                      ? { lat: selectedGuess.lat, lng: selectedGuess.lng }
                      : null
                  }
                  actualLocation={{
                    lat: guessResult.actual_location.latitude,
                    lng: guessResult.actual_location.longitude,
                    name: guessResult.actual_location.name,
                  }}
                  distanceMeters={guessResult.distance_meters}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
