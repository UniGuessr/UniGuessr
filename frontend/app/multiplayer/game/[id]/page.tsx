"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
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

  const handleNextRound = async () => {
    if (!game) return;

    try {
      await markReadyNextRound(gameId, playerId!);
      // Round will advance automatically when all players ready
      // WebSocket will notify us
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance round");
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

  if (gameState === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </main>
    );
  }

  if (gameState === "finished" && leaderboard) {
    const currentPlayer = getCurrentPlayerState();
    const rank = leaderboard.players.findIndex((p: any) => p.player_id === playerId) + 1;

    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Game Complete!</h1>
            <p className="text-slate-600">Final Leaderboard</p>
          </div>

          <Card className="shadow-xl">
            <CardBody className="p-6">
              <div className="space-y-3">
                {leaderboard.players.map((player: any, index: number) => {
                  const isCurrentPlayer = player.player_id === playerId;
                  return (
                    <motion.div
                      key={player.player_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        isCurrentPlayer
                          ? "bg-indigo-50 border-indigo-300"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-slate-400 w-8">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {player.username}
                            {isCurrentPlayer && (
                              <span className="text-sm text-slate-500 ml-2">(You)</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">
                            {player.rounds_completed} rounds completed
                          </div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {player.total_score.toLocaleString()}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="text-center space-y-2">
                  <div className="text-sm text-slate-600">Your Final Score</div>
                  <div className="text-4xl font-bold text-indigo-600">
                    {currentPlayer?.total_score.toLocaleString() || 0}
                  </div>
                  <div className="text-lg text-slate-500">Rank #{rank}</div>
                </div>
              </div>

              <div className="mt-6">
                <PixelButton
                  onPress={() => router.push("/multiplayer")}
                  className="w-full"
                  size="lg"
                >
                  Back to Multiplayer
                </PixelButton>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    );
  }

  if (!game || !currentLocation) return null;

  const currentPlayer = getCurrentPlayerState();
  const hasSubmitted = !!(currentPlayer && currentPlayer.guesses.length > game.current_round);

  return (
    <div className="min-h-screen p-4">
      <AnimatePresence mode="wait">
        {gameState === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-[calc(100vh-2rem)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-sm">
                  Round {currentLocation.round} / {currentLocation.total_rounds}
                </span>
                <span className="text-slate-600 font-medium">
                  Your Score: {currentPlayer?.total_score || 0}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-slate-100 rounded-full">
                  <span className={`font-bold ${timeRemaining <= 5 ? "text-red-600" : "text-slate-900"}`}>
                    {timeRemaining}s
                  </span>
                </div>
                <PixelButton variant="danger" size="sm" onPress={() => router.push("/multiplayer")}>
                  Leave
                </PixelButton>
              </div>
            </div>

            {/* Main game area */}
            <div className="relative h-[calc(100%-3rem)] overflow-hidden flex gap-4">
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
                <Card className="overflow-hidden h-full w-full">
                  <CardBody className="p-0 h-full flex items-center justify-center bg-black">
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
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-lg font-semibold">Where is this location?</p>
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
                    onPress={submitCurrentGuess}
                    isDisabled={!selectedGuess || hasSubmitted}
                    isLoading={loading}
                    variant="secondary"
                  >
                    {hasSubmitted ? "Waiting for others..." : selectedGuess ? "Submit Guess" : "Place your marker on the map"}
                  </PixelButton>
                  {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex-shrink-0">
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
            className="h-[calc(100vh-2rem)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-sm">
                Round {currentLocation.round} / {currentLocation.total_rounds}
              </span>
              <span className="text-slate-600 font-medium">
                Total Score: {currentPlayer?.total_score.toLocaleString() || 0}
              </span>
            </div>

            {/* Result content */}
            <div className="flex gap-4 h-[calc(100%-3rem)]">
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
                      <p className="text-slate-500 text-sm uppercase tracking-wide mb-2">
                        You scored
                      </p>
                      <div className="flex items-baseline justify-center gap-2">
                        <p className={`text-6xl font-bold ${guessResult.points >= 3000 ? 'text-green-500' : guessResult.points >= 1500 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {(guessResult.points - (guessResult.floor_bonus || 0)).toLocaleString()}
                        </p>
                        {guessResult.floor_bonus > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                            className="flex flex-col items-start"
                          >
                            <p className="text-2xl font-bold text-purple-600 leading-none">
                              +{guessResult.floor_bonus}
                            </p>
                            <p className="text-[10px] text-purple-500 uppercase tracking-wider">
                              Floor
                            </p>
                          </motion.div>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        Total: {guessResult.points.toLocaleString()} points
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-center"
                    >
                      <p className="text-slate-500 text-sm">Distance from actual location</p>
                      <p className="text-2xl font-semibold text-slate-700">
                        {formatDistance(guessResult.distance_meters)}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="w-full p-4 bg-emerald-50 rounded-xl border border-emerald-200"
                    >
                      <p className="text-emerald-600 text-sm mb-1">Actual Location</p>
                      <p className="text-emerald-800 font-semibold text-lg">
                        {guessResult.actual_location.name}
                      </p>
                    </motion.div>

                    {gameState === "waiting_results" && (
                      <div className="text-center py-4">
                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                        <p className="text-slate-600">Waiting for other players...</p>
                      </div>
                    )}

                    {gameState === "results" && game.current_round < game.location_ids.length - 1 && (
                      <PixelButton
                        onPress={handleNextRound}
                        size="lg"
                        className="w-full mt-4"
                        variant="secondary"
                      >
                        Next Round →
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
