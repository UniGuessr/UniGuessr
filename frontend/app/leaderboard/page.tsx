"use client";

import { useState, useEffect } from "react";
import { Link } from "@heroui/link";
import { motion, AnimatePresence } from "framer-motion";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api";
import { Trophy, RefreshCw, Calendar, Loader2 } from "lucide-react";

const ROUND_OPTIONS = [
  { key: "all", label: "All" },
  { key: "3", label: "3" },
  { key: "5", label: "5" },
  { key: "10", label: "10" },
];

const DIFFICULTY_OPTIONS = [
  { key: "all", label: "All" },
  { key: "easy", label: "Easy" },
  { key: "normal", label: "Normal" },
  { key: "hard", label: "Hard" },
];

const UNIVERSITY_OPTIONS = [
  { key: null as string | null, label: "All" },
  { key: "concordia", label: "Concordia" },
  { key: "mcgill", label: "McGill" },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRounds, setSelectedRounds] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedRounds, selectedDifficulty, selectedUniversity]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const rounds = selectedRounds === "all" ? undefined : parseInt(selectedRounds);
      const difficulty = selectedDifficulty === "all" ? undefined : selectedDifficulty;
      const data = await getLeaderboard(100, rounds, difficulty, selectedUniversity);
      setEntries(data);
    } catch (err) {
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank: number) => {
    switch(rank) {
      case 1: return { bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-400", icon: <Trophy size={16} className="text-yellow-400" /> };
      case 2: return { bg: "bg-gray-400/20 border-gray-400/40", text: "text-gray-300", icon: null };
      case 3: return { bg: "bg-amber-600/20 border-amber-600/40", text: "text-amber-500", icon: null };
      default: return { bg: "bg-white/5 border-white/10", text: "text-white/40", icon: null };
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 min-h-[90vh] flex items-start justify-center px-4 pt-8"
      >
        <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
          {/* Card Background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/25 via-transparent to-zinc-950/45" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/45 via-zinc-950/15 to-transparent" />
            <div className="absolute inset-0 [background:radial-gradient(90%_60%_at_10%_70%,rgba(0,0,0,.55)_0%,transparent_70%)]" />
          </div>

          {/* Card Content */}
          <div className="relative z-10 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/20 p-2 rounded-lg border border-orange-500/30">
                  <Trophy className="text-orange-500 w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white font-mono uppercase tracking-wider">Leaderboard</h1>
                  <p className="text-xs text-white/40 font-mono uppercase tracking-wider">Top Players</p>
                </div>
              </div>
              <button
                onClick={fetchLeaderboard}
                disabled={loading}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={18} className={`text-white/60 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              {/* University Filter */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-white/40">University</span>
                <div className="flex gap-1">
                  {UNIVERSITY_OPTIONS.map((opt) => (
                    <button
                      key={String(opt.key)}
                      type="button"
                      onClick={() => setSelectedUniversity(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        selectedUniversity === opt.key
                          ? "bg-white/10 text-white border border-white/20"
                          : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rounds Filter */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-white/40">Rounds</span>
                <div className="flex gap-1">
                  {ROUND_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedRounds(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        selectedRounds === opt.key
                          ? "bg-white/10 text-white border border-white/20"
                          : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-white/40">Difficulty</span>
                <div className="flex gap-1">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedDifficulty(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        selectedDifficulty === opt.key
                          ? "bg-white/10 text-white border border-white/20"
                          : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-4"
                >
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                  <p className="text-white/40 text-xs font-mono uppercase tracking-wider">Loading rankings...</p>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 bg-red-500/10 rounded-xl border border-red-500/20"
                >
                  <p className="text-red-400 text-xs font-mono uppercase tracking-wider">{error}</p>
                </motion.div>
              ) : entries.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16 bg-white/5 rounded-xl border border-white/10"
                >
                  <p className="text-white/40 text-xs font-mono uppercase tracking-wider">No scores found for these filters.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {/* Header Row */}
                  <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5 sm:col-span-6">Player</div>
                    <div className="col-span-3 sm:col-span-2 text-right">Score</div>
                    <div className="col-span-3 text-right">Date</div>
                  </div>

                  {/* Player Rows */}
                  <div className="space-y-1">
                    {entries.map((entry, index) => {
                      const rank = entry.rank || index + 1;
                      const rankStyle = getRankDisplay(rank);
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`grid grid-cols-12 px-4 py-3 items-center rounded-lg border transition-all ${
                            rank <= 3 
                              ? rankStyle.bg 
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {/* Rank */}
                          <div className="col-span-1">
                            <div className={`flex items-center justify-center font-bold text-sm font-mono ${rankStyle.text}`}>
                              {rankStyle.icon || rank}
                            </div>
                          </div>

                          {/* User Info */}
                          <div className="col-span-5 sm:col-span-6 pl-2">
                            <div className="font-bold text-white font-mono uppercase tracking-wider text-sm">
                              {entry.username}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase tracking-wider">
                              <span className="bg-white/10 px-1.5 py-0.5 rounded">{entry.difficulty}</span>
                              <span>•</span>
                              <span>{entry.rounds}R</span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="col-span-3 sm:col-span-2 text-right">
                            <span className={`font-black text-lg tabular-nums font-mono ${rank === 1 ? "text-yellow-400" : "text-orange-500"}`}>
                              {entry.score.toLocaleString()}
                            </span>
                          </div>

                          {/* Date */}
                          <div className="col-span-3 text-right flex items-center justify-end gap-1.5 text-white/40">
                            <Calendar size={10} />
                            <span className="text-[10px] font-mono uppercase tracking-wider">
                              {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Back Link */}
            <div className="pt-4">
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
    </div>
  );
}
