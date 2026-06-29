"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Link } from "@heroui/link";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Input } from "@heroui/input";
import { motion, AnimatePresence } from "framer-motion";
import GuessMap from "@/components/guess-map";
import { PixelButton } from "@/components/Button/pixel-button";
import FloorSelector from "@/components/Floor Selection/floor-selector";
import { findNearbyBuilding, type Building } from "@/config/buildings";
import {
  createSession,
  getCurrentLocation,
  submitGuess,
  saveScoreToLeaderboard,
  type Session,
  type CurrentLocation,
  type GuessResult,
} from "@/lib/api";

type GameState = "setup" | "playing" | "result" | "finished";

type Difficulty = "easy" | "normal" | "hard";

const TIMER_OPTIONS = [10, 20, 30];

const ROUND_OPTIONS = [3, 5, 10];

const UNIVERSITY_OPTIONS = [
  { key: null, label: "All" },
  { key: "concordia", label: "Concordia" },
  { key: "mcgill", label: "McGill" },
];

export default function SinglePlayerPage() {
  // Setup state
  const [rounds, setRounds] = useState<number>(5);
  const [timerDuration, setTimerDuration] = useState<number>(20);
  const [university, setUniversity] = useState<string | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>("setup");
  const [session, setSession] = useState<Session | null>(null);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [roundScores, setRoundScores] = useState<number[]>([]);

  // Floor selection state
  const [nearbyBuilding, setNearbyBuilding] = useState<Building | null>(null);
  const [showFloorSelector, setShowFloorSelector] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Leaderboard state
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [username, setUsername] = useState("");
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  
  // Map reveal timer
  const [mapCountdown, setMapCountdown] = useState(3);
  const [showMap, setShowMap] = useState(false);
  
  // Round timer (25 seconds)
  const [roundTimer, setRoundTimer] = useState(20);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpHandledRef = useRef(false);

  // Prefetched next-round location (fetched in background during result screen)
  const prefetchedLocationRef = useRef<CurrentLocation | null>(null);

  // Countdown timer effect for map reveal
  useEffect(() => {
    if (gameState === "playing" && mapCountdown > 0) {
      const timer = setTimeout(() => {
        setMapCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "playing" && mapCountdown === 0 && !showMap) {
      setShowMap(true);
      setRoundTimer(timerDuration); // Start round timer when map appears
      timeUpHandledRef.current = false; // Reset for new round
    }
  }, [gameState, mapCountdown, showMap, timerDuration]);

  // Round timer countdown effect - updates every 100ms for smooth animation
  useEffect(() => {
    if (gameState === "playing" && showMap && roundTimer > 0 && !loading) {
      roundTimerRef.current = setTimeout(() => {
        setRoundTimer((prev) => Math.max(0, prev - 0.1));
      }, 100);
      return () => {
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
      };
    } else if (gameState === "playing" && showMap && roundTimer <= 0 && !loading && !timeUpHandledRef.current) {
      // Time's up - give 0 points and show result
      timeUpHandledRef.current = true;
      handleTimeUp();
    }
  }, [gameState, showMap, roundTimer, loading]);

  const handleTimeUp = async () => {
    if (!session || !currentLocation) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Submit a guess with coordinates far away to get 0 points
      // This ensures the backend advances to the next round
      const result = await submitGuess(session.id, 0, 0, null);
      
      // Override points to 0 since time ran out
      const timeUpResult = {
        ...result,
        points: 0,
        floor_bonus: 0,
        total_score: result.total_score - result.points, // Subtract the points backend gave
      };
      
      setRoundScores((prev) => [...prev, 0]);
      setGuessResult(timeUpResult);
      setGameState("result");

      // Prefetch next round in the background
      if (!timeUpResult.game_complete) {
        prefetchedLocationRef.current = null;
        getCurrentLocation(session.id)
          .then((loc) => { prefetchedLocationRef.current = loc; })
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit timeout");
      // Fallback: still show result screen with 0 points
      const isLastRound = currentLocation.round === currentLocation.total_rounds;
      const currentTotalScore = roundScores.reduce((a, b) => a + b, 0);
      
      setRoundScores((prev) => [...prev, 0]);
      setGuessResult({
        points: 0,
        distance_meters: 0,
        total_score: currentTotalScore,
        actual_location: {
          name: currentLocation.name || "Time's Up!",
          latitude: 0,
          longitude: 0,
        },
        guessed_location: {
          latitude: 0,
          longitude: 0,
        },
        round_complete: true,
        game_complete: isLastRound,
        current_round: currentLocation.round,
        floor_bonus: 0,
        actual_floor: null,
        guessed_floor: null,
      });
      setGameState("result");
    } finally {
      setLoading(false);
      setShowFloorSelector(false);
      setSelectedFloor(null);
      setNearbyBuilding(null);
    }
  };

  const startGame = async () => {
    setLoading(true);
    setError(null);
    setMapCountdown(3);
    setShowMap(false);
    setRoundTimer(timerDuration);
    timeUpHandledRef.current = false;

    try {
      const newSession = await createSession({ rounds, difficulty: "normal", university });
      setSession(newSession);

      const location = await getCurrentLocation(newSession.id);
      setCurrentLocation(location);
      setGameState("playing");
      setRoundScores([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  const handleGuessSelect = useCallback((lat: number, lng: number) => {
    setSelectedGuess({ lat, lng });
    
    // Check if pin is near a building with floors - show selector immediately
    const building = findNearbyBuilding(lat, lng);
    if (building) {
      setNearbyBuilding(building);
      setShowFloorSelector(true);
    } else {
      // Clear floor selection if moving away from building
      setNearbyBuilding(null);
      setShowFloorSelector(false);
      setSelectedFloor(null);
    }
  }, []);

  const submitCurrentGuess = async () => {
    if (!session || !selectedGuess) return;

    // Submit with selected floor if available, otherwise without floor
    await finalizeGuessSubmission(selectedFloor);
  };

  const finalizeGuessSubmission = async (floor: number | null) => {
    if (!session || !selectedGuess) return;

    setLoading(true);
    setError(null);

    try {
      const result = await submitGuess(session.id, selectedGuess.lat, selectedGuess.lng, floor);
      setGuessResult(result);
      setRoundScores((prev) => [...prev, result.points]);
      setGameState("result");

      // Prefetch the next round's location in the background while the player
      // reviews their result, so "Next Round" is instant.
      if (!result.game_complete) {
        prefetchedLocationRef.current = null;
        getCurrentLocation(session.id)
          .then((loc) => { prefetchedLocationRef.current = loc; })
          .catch(() => {});
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


  const nextRound = async () => {
    if (!session || !guessResult) return;

    if (guessResult.game_complete) {
      setGameState("finished");
      return;
    }

    setLoading(true);
    setError(null);
    setMapCountdown(3);
    setShowMap(false);
    setRoundTimer(timerDuration);
    timeUpHandledRef.current = false;

    try {
      // Use the prefetched location if it arrived during the result screen,
      // otherwise fall back to a fresh fetch.
      const location = prefetchedLocationRef.current ?? await getCurrentLocation(session.id);
      prefetchedLocationRef.current = null;
      setCurrentLocation(location);
      setGuessResult(null);
      setSelectedGuess(null);
      setGameState("playing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load next round");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveScore = async () => {
    if (!username.trim() || !guessResult) return;
    
    setIsSavingScore(true);
    setError(null);
    
    try {
      await saveScoreToLeaderboard({
        username: username.trim(),
        score: guessResult.total_score,
        rounds,
        difficulty: "normal",
        university,
      });
      setScoreSaved(true);
      setTimeout(() => {
        setShowLeaderboardModal(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save score");
    } finally {
      setIsSavingScore(false);
    }
  };
  
  const handleCloseModal = () => {
    setShowLeaderboardModal(false);
    setUsername("");
    setError(null);
  };

  const resetGame = () => {
    setGameState("setup");
    setSession(null);
    setCurrentLocation(null);
    setGuessResult(null);
    setSelectedGuess(null);
    setRoundScores([]);
    setError(null);
    setShowLeaderboardModal(false);
    setUsername("");
    setScoreSaved(false);
    prefetchedLocationRef.current = null;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const getScoreColor = (): string => {
    return "text-orange-500";
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {/* SETUP SCREEN */}
        {gameState === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 min-h-[80vh] flex items-center justify-center px-4"
          >
            
            
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm mt-15">
              {/* Card Background */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/25 via-transparent to-zinc-950/45" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/45 via-zinc-950/15 to-transparent" />
                <div className="absolute inset-0 [background:radial-gradient(90%_60%_at_10%_70%,rgba(0,0,0,.55)_0%,transparent_70%)]" />
              </div>

              {/* Card Content */}
              <div className="relative z-10 p-8 space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">New Game</h1>
                  <p className="text-xs text-white/50 font-mono uppercase tracking-wider">Configure your settings</p>
                </div>

              {/* Options */}
              <div className="space-y-6">
                {/* University */}
                <div className="space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-white/40">University</span>
                  <div className="flex gap-2">
                    {UNIVERSITY_OPTIONS.map((opt) => (
                      <button
                        key={String(opt.key)}
                        type="button"
                        onClick={() => setUniversity(opt.key)}
                        className={`flex-1 py-3 rounded-lg text-sm font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                          university === opt.key
                            ? "bg-white/10 text-white border border-white/20"
                            : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rounds */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-white/40">Rounds</span>
                  </div>
                  <div className="flex gap-2">
                    {ROUND_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRounds(opt)}
                        className={`flex-1 py-3 rounded-lg text-sm font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                          rounds === opt
                            ? "bg-white/10 text-white border border-white/20"
                            : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div className="space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-white/40">Timer (seconds)</span>
                  <div className="flex gap-2">
                    {TIMER_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTimerDuration(opt)}
                        className={`flex-1 py-3 rounded-lg font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          timerDuration === opt
                            ? "bg-white/10 border border-white/20 text-white"
                            : "bg-white/5 border border-transparent text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {opt}s
                      </button>
                    ))}
                  </div>
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
                <PixelButton
                  size="lg"
                  className="w-full"
                  onClick={startGame}
                  isLoading={loading}
                  variant="secondary"
                >
                  Start Game
                </PixelButton>

                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 py-2 text-orange-500 text-xs font-mono uppercase tracking-wider hover:text-orange-400 transition-colors"
                >
                  ← Back
                </Link>
              </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === "playing" && currentLocation && (
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
                  Score: {roundScores.reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
              </div>
              <PixelButton variant="danger" size="sm" onClick={resetGame}>
                Quit Game
              </PixelButton>
            </div>

            {/* Round Timer */}
            {showMap && (
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 relative">
                  {/* Outer glow */}
                  <div
                    className="absolute -inset-1 rounded-full opacity-60 blur-md transition-all duration-300"
                    style={{
                      background: `linear-gradient(90deg, 
                        rgba(249, 115, 22, ${0.3 + (roundTimer / timerDuration) * 0.5}) 0%, 
                        rgba(249, 115, 22, ${0.4 + (roundTimer / timerDuration) * 0.4}) ${(roundTimer / timerDuration) * 100}%, 
                        transparent ${(roundTimer / timerDuration) * 100}%)`,
                    }}
                  />
                  {/* Main bar background */}
                  <div className="relative h-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden">
                    {/* Progress bar */}
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      initial={{ width: "100%" }}
                      animate={{ width: `${(roundTimer / timerDuration) * 100}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                      style={{
                        background: roundTimer <= 5 
                          ? `linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)`
                          : `linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)`,
                        boxShadow: roundTimer <= 5
                          ? `0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)`
                          : `0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
                      }}
                    >
                      {/* Trailing particle */}
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full animate-pulse"
                        style={{
                          background: "radial-gradient(circle, #fff 0%, transparent 70%)",
                          boxShadow: roundTimer <= 5
                            ? `0 0 10px #fff, 0 0 20px rgba(220, 38, 38, 0.8), 0 0 30px rgba(248, 113, 113, 0.6)`
                            : `0 0 10px #fff, 0 0 20px rgba(249, 115, 22, 0.8), 0 0 30px rgba(251, 146, 60, 0.6)`,
                        }}
                      />
                    </motion.div>
                  </div>
                </div>
                <span className={`text-sm font-mono font-bold min-w-[40px] text-right ${roundTimer <= 5 ? 'text-red-500' : 'text-orange-500'}`}>
                  {Math.ceil(roundTimer)}s
                </span>
              </div>
            )}

            {/* Main game area - consistent height with result screen */}
            <div className="relative h-[calc(100%-1rem)] overflow-hidden flex gap-4">
              {/* Location image - starts fullscreen, then shrinks to left half */}
              <motion.div
                initial={{ opacity: 0, width: "100%" }}
                animate={{ 
                  opacity: 1,
                  width: showMap ? "49%" : "100%",
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
                      
                      {/* Countdown timer overlay */}
                      {!showMap && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2"
                        >
                          <span className="text-white text-sm font-mono uppercase tracking-wider">Map appears in</span>
                          <motion.span
                            key={mapCountdown}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-white font-bold text-xl min-w-[24px] text-center font-mono"
                          >
                            {mapCountdown}
                          </motion.span>
                        </motion.div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>

              {/* Map for guessing - slides in from right */}
              {showMap && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full w-1/2 flex-shrink-0"
                >
                  <div className="flex flex-col h-full w-full overflow-hidden relative">
                    <div className="flex-1 min-h-0 overflow-hidden relative">
                      <GuessMap onGuess={handleGuessSelect} disabled={loading} />
                      {/* Floor selector positioned near top-right of map */}
                      <AnimatePresence>
                        {showFloorSelector && nearbyBuilding && (
                          <FloorSelector
                            key={nearbyBuilding.id}
                            className="absolute top-4 left-4 z-50"
                            building={nearbyBuilding}
                            selectedFloor={selectedFloor}
                            onFloorSelect={setSelectedFloor}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <PixelButton
                      size="lg"
                      className="flex-shrink-0 w-full"
                      onClick={submitCurrentGuess}
                      disabled={!selectedGuess}
                      isLoading={loading}
                      variant="secondary"
                    >
                      {selectedGuess ? "Submit Guess" : "Place your marker on the map"}
                    </PixelButton>
                    {error && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-mono uppercase tracking-wider flex-shrink-0">
                        {error}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* RESULT SCREEN */}
        {gameState === "result" && guessResult && currentLocation && (
          <motion.div
            key="result"
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
                Total Score: {guessResult.total_score.toLocaleString()}
              </span>
            </div>

            {/* Result content - consistent height and gap with playing screen */}
            <div className="flex gap-4 h-[calc(100%-4rem)]">
              {/* Score card - matches left side width of playing screen */}
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
                        <p className={`text-6xl font-bold font-mono ${getScoreColor()}`}>
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

                    {/* Floor bonus display */}
                    {guessResult.floor_bonus > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.45, type: "spring" }}
                        className="w-full p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-600 text-xs font-bold uppercase tracking-wide font-mono uppercase tracking-wider">
                              Floor Bonus!
                            </p>
                            <p className="text-purple-800 font-semibold text-sm font-mono uppercase tracking-wider">
                              Floor {guessResult.actual_floor} - Correct!
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-purple-600 font-mono uppercase tracking-wider">
                            +{guessResult.floor_bonus}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Show floor info even if wrong or not guessed */}
                    {guessResult.actual_floor && !guessResult.floor_bonus && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <p className="text-slate-600 text-xs text-center font-mono uppercase tracking-wider">
                          {guessResult.guessed_floor 
                            ? `Actual floor: ${guessResult.actual_floor} (You guessed: ${guessResult.guessed_floor})`
                            : `This was on floor ${guessResult.actual_floor}`
                          }
                        </p>
                      </motion.div>
                    )}

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

                    <PixelButton
                      size="lg"
                      className="w-full mt-4"
                      onClick={nextRound}
                      isLoading={loading}
                      variant="secondary"
                    >
                      {guessResult.game_complete ? "See Final Results" : "Next Round →"}
                    </PixelButton>
                  </CardBody>
                </Card>
              </div>

              {/* Map showing result - matches right side width of playing screen */}
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

        {/* FINISHED SCREEN */}
        {gameState === "finished" && guessResult && (
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
                  <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">Game Complete!</h1>
                  <p className="text-xs text-white/50 font-mono uppercase tracking-wider">Here&apos;s how you did</p>
                </motion.div>

                {/* Final Score */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center py-4"
                >
                  <p className="text-xs text-white/40 mb-2 font-mono uppercase tracking-wider">
                    Final Score
                  </p>
                  <p className="text-5xl font-bold text-orange-500 font-mono">
                    {guessResult.total_score.toLocaleString()}
                  </p>
                  <p className="text-white/40 mt-2 text-xs font-mono uppercase tracking-wider">
                    out of {rounds * 5000} possible points
                  </p>
                </motion.div>

                {/* Round Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <h3 className="text-xs font-semibold text-white/40 font-mono uppercase tracking-wider">Round Breakdown</h3>
                  <div className="space-y-2">
                    {roundScores.map((score, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <span className="text-white/60 text-sm font-mono uppercase tracking-wider">Round {index + 1}</span>
                        <span className="font-semibold text-orange-500 font-mono uppercase tracking-wider">
                          {score.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10 font-mono uppercase tracking-wider">
                    <p className="text-2xl font-bold text-orange-500">
                      {Math.round((guessResult.total_score / (rounds * 5000)) * 100)}%
                    </p>
                    <p className="text-white/40 text-xs">Accuracy</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10 font-mono uppercase tracking-wider">
                    <p className="text-2xl font-bold text-orange-500">{rounds}</p>
                    <p className="text-white/40 text-xs">Rounds</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10 font-mono uppercase tracking-wider">
                    <p className="text-2xl font-bold text-orange-500">{timerDuration}s</p>
                    <p className="text-white/40 text-xs">Timer</p>
                  </div>
                </motion.div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {!scoreSaved && (
                    <PixelButton
                      size="lg"
                      className="w-full"
                      onClick={() => setShowLeaderboardModal(true)}
                      variant="success"
                    >
                      Save to Leaderboard
                    </PixelButton>
                  )}
                  {scoreSaved && (
                    <div className="w-full p-3 bg-emerald-500/20 rounded-lg text-center border border-emerald-500/30">
                      <p className="text-emerald-400 font-medium text-xs font-mono uppercase tracking-wider">Score saved to leaderboard!</p>
                    </div>
                  )}
                  <div className="flex gap-3 w-full">
                    <PixelButton
                      size="lg"
                      className="flex-1"
                      onClick={resetGame}
                      variant="secondary"
                    >
                      Play Again
                    </PixelButton>
                    <PixelButton
                      href="/leaderboard"
                      size="lg"
                      className="flex-1"
                      variant="secondary"
                    >
                      Leaderboard
                    </PixelButton>
                  </div>
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
        )}
      </AnimatePresence>
      
      {/* Save Score Modal */}
      <Modal 
        isOpen={showLeaderboardModal} 
        onClose={handleCloseModal}
        isDismissable={!isSavingScore && !scoreSaved}
        classNames={{
          base: "bg-zinc-900 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 font-mono uppercase tracking-wider text-white">
            {scoreSaved ? "Score Saved!" : "Save Your Score"}
          </ModalHeader>
          <ModalBody>
            {scoreSaved ? (
              <div className="text-center py-4 font-mono uppercase tracking-wider">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-sm text-white/60">
                  Your score has been saved to the leaderboard!
                </p>
                <p className="text-3xl font-bold text-orange-500 mt-4 font-mono">
                  {guessResult?.total_score.toLocaleString()} points
                </p>
              </div>
            ) : (
              <>
                <p className="text-white/60 mb-2 text-xs font-mono uppercase tracking-wider">
                  Enter your username to save your score.
                </p>
                <div className="bg-white/5 border border-white/10 p-4 rounded-lg mb-4 font-mono uppercase tracking-wider">
                  <p className="text-2xl font-bold text-orange-500 text-center">
                    {guessResult?.total_score.toLocaleString()} points
                  </p>
                  <p className="text-xs text-white/40 text-center">
                    {rounds} rounds • {timerDuration}s timer
                  </p>
                </div>
                <Input
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={50}
                  isDisabled={isSavingScore}
                  autoFocus
                  classNames={{
                    label: "text-white/60",
                    input: "text-white",
                    inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && username.trim()) {
                      handleSaveScore();
                    }
                  }}
                />
                {error && (
                  <p className="text-red-400 text-xs mt-2 font-mono uppercase tracking-wider">{error}</p>
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter>
            {!scoreSaved && (
              <div className="flex gap-2 w-full">
                <PixelButton 
                  variant="secondary" 
                  onClick={handleCloseModal}
                  disabled={isSavingScore}
                  size="sm"
                >
                  Cancel
                </PixelButton>
                <PixelButton 
                  variant="secondary" 
                  onClick={handleSaveScore}
                  isLoading={isSavingScore}
                  disabled={!username.trim() || isSavingScore}
                  size="sm"
                >
                  Save Score
                </PixelButton>
              </div>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}