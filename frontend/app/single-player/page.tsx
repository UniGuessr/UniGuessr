"use client";

import { useState, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Progress } from "@heroui/progress";
import { Link } from "@heroui/link";
import { motion, AnimatePresence } from "framer-motion";
import GuessMap from "@/components/guess-map";
import {
  createSession,
  getCurrentLocation,
  submitGuess,
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

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = async () => {
    setLoading(true);
    setError(null);

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
  }, []);

  const submitCurrentGuess = async () => {
    if (!session || !selectedGuess) return;

    setLoading(true);
    setError(null);

    try {
      const result = await submitGuess(session._id, selectedGuess.lat, selectedGuess.lng);
      setGuessResult(result);
      setRoundScores((prev) => [...prev, result.points]);
      setGameState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guess");
    } finally {
      setLoading(false);
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

  const resetGame = () => {
    setGameState("setup");
    setSession(null);
    setCurrentLocation(null);
    setGuessResult(null);
    setSelectedGuess(null);
    setRoundScores([]);
    setError(null);
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
    <div className="min-h-screen pb-8">
      <AnimatePresence mode="wait">
        {/* SETUP SCREEN */}
        {gameState === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto"
          >
            <Card className="shadow-xl">
              <CardHeader className="flex flex-col gap-2 pb-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Single Player
                </h1>
                <p className="text-slate-500">
                  Test your knowledge of Concordia University campus!
                </p>
              </CardHeader>

              <CardBody className="gap-6 pt-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Number of Rounds
                  </label>
                  <div className="flex gap-3">
                    {ROUND_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        variant={rounds === opt ? "solid" : "bordered"}
                        color={rounds === opt ? "primary" : "default"}
                        onPress={() => setRounds(opt)}
                        className="flex-1 font-semibold"
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Difficulty
                  </label>
                  <Select
                    selectedKeys={[difficulty]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as Difficulty;
                      if (selected) setDifficulty(selected);
                    }}
                    classNames={{
                      trigger: "h-14",
                    }}
                  >
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} textValue={opt.label}>
                        <div className="flex flex-col">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-slate-500">{opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
              </CardBody>

              <CardFooter className="flex flex-col gap-3">
                <Button
                  color="primary"
                  size="lg"
                  className="w-full font-semibold text-lg"
                  onPress={startGame}
                  isLoading={loading}
                >
                  Start Game
                </Button>
                <Link href="/" className="text-slate-500 text-sm">
                  ← Back to Home
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === "playing" && currentLocation && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              <Button variant="light" color="danger" size="sm" onPress={resetGame}>
                Quit Game
              </Button>
            </div>

            {/* Progress bar */}
            <Progress
              value={(currentLocation.round / currentLocation.total_rounds) * 100}
              className="mb-4"
              color="primary"
              size="sm"
            />

            {/* Main game area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-6rem)]">
              {/* Location image */}
              <Card className="overflow-hidden">
                <CardBody className="p-0 h-full">
                  <div className="relative w-full h-full min-h-[300px]">
                    <img
                      src={currentLocation.image_url}
                      alt="Where is this?"
                      className="w-full h-full object-cover"
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

              {/* Map for guessing */}
              <div className="flex flex-col gap-3 min-h-[300px]">
                <div className="flex-1">
                  <GuessMap onGuess={handleGuessSelect} disabled={loading} />
                </div>
                <Button
                  color="primary"
                  size="lg"
                  className="font-semibold"
                  onPress={submitCurrentGuess}
                  isDisabled={!selectedGuess}
                  isLoading={loading}
                >
                  {selectedGuess ? "Submit Guess" : "Place your marker on the map"}
                </Button>
                {error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* RESULT SCREEN */}
        {gameState === "result" && guessResult && currentLocation && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-[calc(100vh-8rem)]"
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

            {/* Result content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-6rem)]">
              {/* Score card */}
              <Card className="bg-gradient-to-br from-slate-50 to-white">
                <CardBody className="flex flex-col items-center justify-center gap-6 p-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="text-center"
                  >
                    <p className="text-slate-500 text-sm uppercase tracking-wide mb-2">
                      You scored
                    </p>
                    <p className={`text-6xl font-bold ${getScoreColor(guessResult.points)}`}>
                      {guessResult.points.toLocaleString()}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">points</p>
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

                  <Button
                    color="primary"
                    size="lg"
                    className="w-full font-semibold mt-4"
                    onPress={nextRound}
                    isLoading={loading}
                  >
                    {guessResult.game_complete ? "See Final Results" : "Next Round →"}
                  </Button>
                </CardBody>
              </Card>

              {/* Map showing result */}
              <div className="min-h-[300px]">
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

              <CardFooter className="flex gap-3 p-6 pt-0">
                <Button
                  color="primary"
                  size="lg"
                  className="flex-1 font-semibold"
                  onPress={resetGame}
                >
                  Play Again
                </Button>
                <Button
                  as={Link}
                  href="/"
                  variant="bordered"
                  size="lg"
                  className="flex-1 font-semibold"
                >
                  Home
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
