"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Link } from "@heroui/link";
import { motion } from "framer-motion";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api";

const ROUND_OPTIONS = [
  { key: "all", label: "All Rounds" },
  { key: "3", label: "3 Rounds" },
  { key: "5", label: "5 Rounds" },
  { key: "10", label: "10 Rounds" },
];

const DIFFICULTY_OPTIONS = [
  { key: "all", label: "All Difficulties" },
  { key: "easy", label: "Easy" },
  { key: "normal", label: "Normal" },
  { key: "hard", label: "Hard" },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRounds, setSelectedRounds] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedRounds, selectedDifficulty]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const rounds = selectedRounds === "all" ? undefined : parseInt(selectedRounds);
      const difficulty = selectedDifficulty === "all" ? undefined : selectedDifficulty;
      
      const data = await getLeaderboard(100, rounds, difficulty);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-slate-400";
    if (rank === 3) return "text-amber-600";
    return "text-slate-600";
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">🏆 Leaderboard</h1>
              <p className="text-slate-600">
                Compete with players and climb to the top!
              </p>
            </div>
            <Button
              as={Link}
              href="/"
              variant="bordered"
              size="lg"
            >
              Home
            </Button>
          </div>

          {/* Filters */}
          <Card className="bg-white shadow-sm">
            <CardBody>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select
                  label="Rounds"
                  placeholder="Select rounds"
                  selectedKeys={[selectedRounds]}
                  onChange={(e) => setSelectedRounds(e.target.value)}
                  className="flex-1"
                >
                  {ROUND_OPTIONS.map((option) => (
                    <SelectItem key={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label="Difficulty"
                  placeholder="Select difficulty"
                  selectedKeys={[selectedDifficulty]}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="flex-1"
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <SelectItem key={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                <Button
                  color="primary"
                  onPress={fetchLeaderboard}
                  className="sm:self-end"
                  isLoading={loading}
                >
                  Refresh
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Leaderboard Content */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardBody>
              <p className="text-red-600 text-center">{error}</p>
            </CardBody>
          </Card>
        )}

        {!loading && !error && entries.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-slate-500 text-center py-10">
                No scores yet. Be the first to play and save your score!
              </p>
            </CardBody>
          </Card>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className={`
                    transition-all hover:shadow-md
                    ${entry.rank === 1 ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200" : ""}
                    ${entry.rank === 2 ? "bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200" : ""}
                    ${entry.rank === 3 ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200" : ""}
                  `}
                >
                  <CardBody>
                    <div className="flex items-center justify-between gap-4">
                      {/* Rank */}
                      <div className={`text-2xl font-bold ${getRankColor(entry.rank || index + 1)} min-w-[60px]`}>
                        {getRankBadge(entry.rank || index + 1)}
                      </div>

                      {/* Username */}
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-semibold text-slate-800 truncate">
                          {entry.username}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="capitalize">{entry.difficulty}</span>
                          <span>•</span>
                          <span>{entry.rounds} rounds</span>
                          <span>•</span>
                          <span>{formatDate(entry.created_at)}</span>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">
                          {entry.score.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">points</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Card className="bg-indigo-50">
              <CardBody>
                <div className="flex items-center justify-center gap-8 text-center">
                  <div>
                    <p className="text-3xl font-bold text-indigo-600">{entries.length}</p>
                    <p className="text-sm text-indigo-700">Total Scores</p>
                  </div>
                  {entries[0] && (
                    <>
                      <div className="h-8 w-px bg-indigo-200" />
                      <div>
                        <p className="text-3xl font-bold text-indigo-600">
                          {entries[0].score.toLocaleString()}
                        </p>
                        <p className="text-sm text-indigo-700">Highest Score</p>
                      </div>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
