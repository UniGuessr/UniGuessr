"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Progress } from "@heroui/progress";
import { Link } from "@heroui/link";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Input } from "@heroui/input";
import { motion, AnimatePresence } from "framer-motion";
import GuessMap from "@/components/guess-map";
import { PixelButton } from "@/components/pixel-button";
import FloorSelector from "@/components/floor-selector";
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

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; description: string }[] = [
  { key: "easy", label: "Easy", description: "Larger scoring radius" },
  { key: "normal", label: "Normal", description: "Standard scoring" },
  { key: "hard", label: "Hard", description: "Precise guesses required" },
];

const ROUND_OPTIONS = [3, 5, 10];

export default function SinglePlayerPage() {
  // Setup state
  const [rounds, setRounds] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

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

  // Countdown timer effect
  useEffect(() => {
    if (gameState === "playing" && mapCountdown > 0) {
      const timer = setTimeout(() => {
        setMapCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "playing" && mapCountdown === 0 && !showMap) {
      setShowMap(true);
    }
  }, [gameState, mapCountdown, showMap]);

  const startGame = async () => {
    setLoading(true);
    setError(null);
    setMapCountdown(3);
    setShowMap(false);

    try {
      const newSession = await createSession({ rounds, difficulty });
      setSession(newSession);

      const location = await getCurrentLocation(newSession._id);
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
      const result = await submitGuess(session._id, selectedGuess.lat, selectedGuess.lng, floor);
      setGuessResult(result);
      setRoundScores((prev) => [...prev, result.points]);
      setGameState("result");
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

    try {
      const location = await getCurrentLocation(session._id);
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
        difficulty,
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
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const getScoreColor = (points: number): string => {
    if (points >= 4500) return "text-emerald-500";
    if (points >= 3000) return "text-green-500";
    if (points >= 1500) return "text-yellow-500";
    if (points >= 500) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {/* SETUP SCREEN */}
        {gameState === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-md mx-auto h-full flex flex-col justify-center px-4"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Ready to Play?
              </h1>
              <p className="text-slate-500 mt-2">Configure your Concordia expedition</p>
            </div>

            <Card className="border-none shadow-2xl shadow-indigo-100/50 bg-white/80 backdrop-blur-xl">
              <CardBody className="gap-8 p-8">
                {/* Rounds Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Length</span>
                    <span className="text-xs font-medium text-indigo-500">{rounds} Rounds</span>
                  </div>
                  <div className="flex p-1 bg-slate-100/50 rounded-xl gap-1">
                    {ROUND_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setRounds(opt)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          rounds === opt 
                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" 
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Section */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Challenge</span>
                  <div className="grid grid-cols-1 gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setDifficulty(opt.key as Difficulty)}
                        className={`flex items-center p-4 rounded-xl border-2 transition-all text-left ${
                          difficulty === opt.key 
                            ? "border-indigo-500 bg-indigo-50/50" 
                            : "border-slate-100 hover:border-slate-200 bg-transparent"
                        }`}
                      >
                        <div className="flex-1">
                          <p className={`font-bold text-sm ${difficulty === opt.key ? "text-indigo-700" : "text-slate-700"}`}>
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            {opt.description}
                          </p>
                        </div>
                        {difficulty === opt.key && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-center text-xs font-semibold text-red-500 bg-red-50 py-2 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <PixelButton
                    size="lg"
                    className="w-full h-14"
                    onClick={startGame}
                    isLoading={loading}
                    variant="secondary"
                  >
                    Launch Expedition
                  </PixelButton>
                  
                  <Link 
                    href="/" 
                    className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors uppercase tracking-widest"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Cancel
                  </Link>
                </div>
              </CardBody>
            </Card>
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
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-sm">
                  Round {currentLocation.round} / {currentLocation.total_rounds}
                </span>
                <span className="text-slate-600 font-medium">
                  Score: {roundScores.reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
              </div>
              <PixelButton variant="danger" size="sm" onClick={resetGame}>
                Quit Game
              </PixelButton>
            </div>

            {/* Progress bar */}
            <Progress
              value={(currentLocation.round / currentLocation.total_rounds) * 100}
              className="mb-4"
              color="primary"
              size="sm"
            />

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
                      
                      {/* Countdown timer overlay */}
                      {!showMap && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2"
                        >
                          <span className="text-white text-sm">Map appears in</span>
                          <motion.span
                            key={mapCountdown}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-white font-bold text-xl min-w-[24px] text-center"
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
                      disabled={!selectedGuess}
                      isLoading={loading}
                      variant="secondary"
                    >
                      {selectedGuess ? "Submit Guess" : "Place your marker on the map"}
                    </PixelButton>
                    {error && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex-shrink-0">
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
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-sm">
                Round {currentLocation.round} / {currentLocation.total_rounds}
              </span>
              <span className="text-slate-600 font-medium">
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
                      <p className="text-slate-500 text-sm uppercase tracking-wide mb-2">
                        You scored
                      </p>
                      <div className="flex items-baseline justify-center gap-2">
                        <p className={`text-6xl font-bold ${getScoreColor(guessResult.points - (guessResult.floor_bonus || 0))}`}>
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
                            <p className="text-purple-600 text-xs font-bold uppercase tracking-wide">
                              🎯 Floor Bonus!
                            </p>
                            <p className="text-purple-800 font-semibold text-sm">
                              Floor {guessResult.actual_floor} - Correct!
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-purple-600">
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
                        <p className="text-slate-600 text-xs text-center">
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
                      <p className="text-emerald-600 text-sm mb-1">Actual Location</p>
                      <p className="text-emerald-800 font-semibold text-lg">
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
            className="max-w-2xl mx-auto"
          >
            <Card className="shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <h1 className="text-4xl font-bold mb-2">Game Complete!</h1>
                  <p className="text-indigo-200">Here&apos;s how you did</p>
                </motion.div>
              </div>

              <CardBody className="p-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-8"
                >
                  <p className="text-slate-500 text-sm uppercase tracking-wide mb-2">
                    Final Score
                  </p>
                  <p className="text-6xl font-bold text-indigo-600">
                    {guessResult.total_score.toLocaleString()}
                  </p>
                  <p className="text-slate-400 mt-2">
                    out of {rounds * 5000} possible points
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Round Breakdown</h3>
                  <div className="space-y-2">
                    {roundScores.map((score, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="text-slate-600">Round {index + 1}</span>
                        <span className={`font-semibold ${getScoreColor(score)}`}>
                          {score.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-3 gap-4 mb-8"
                >
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-600">
                      {Math.round((guessResult.total_score / (rounds * 5000)) * 100)}%
                    </p>
                    <p className="text-emerald-700 text-sm">Accuracy</p>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 rounded-xl">
                    <p className="text-3xl font-bold text-indigo-600">{rounds}</p>
                    <p className="text-indigo-700 text-sm">Rounds</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <p className="text-3xl font-bold text-purple-600 capitalize">{difficulty}</p>
                    <p className="text-purple-700 text-sm">Difficulty</p>
                  </div>
                </motion.div>
              </CardBody>

              <CardFooter className="flex flex-col gap-3 p-6 pt-0">
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
                  <div className="w-full p-3 bg-emerald-50 rounded-lg text-center">
                    <p className="text-emerald-700 font-medium">✓ Score saved to leaderboard!</p>
                  </div>
                )}
                <div className="flex flex-col gap-2 w-full">
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
                      🏆 Leaderboard
                    </PixelButton>
                  </div>
                  <PixelButton
                    href="/"
                    size="sm"
                    className="w-full"
                    variant="secondary"
                  >
                    Back to Home
                  </PixelButton>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Save Score Modal */}
      <Modal 
        isOpen={showLeaderboardModal} 
        onClose={handleCloseModal}
        isDismissable={!isSavingScore && !scoreSaved}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {scoreSaved ? "Score Saved!" : "Save Your Score"}
          </ModalHeader>
          <ModalBody>
            {scoreSaved ? (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-lg text-slate-700">
                  Your score has been saved to the leaderboard!
                </p>
                <p className="text-3xl font-bold text-indigo-600 mt-4">
                  {guessResult?.total_score.toLocaleString()} points
                </p>
              </div>
            ) : (
              <>
                <p className="text-slate-600 mb-2">
                  Great game! Enter your username to save your score to the leaderboard.
                </p>
                <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                  <p className="text-2xl font-bold text-indigo-600 text-center">
                    {guessResult?.total_score.toLocaleString()} points
                  </p>
                  <p className="text-sm text-slate-500 text-center">
                    {rounds} rounds • {difficulty} difficulty
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && username.trim()) {
                      handleSaveScore();
                    }
                  }}
                />
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
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