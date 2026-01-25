"use client";

import { useState, useEffect } from "react";
import { Card, CardBody } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Link } from "@heroui/link";
import { motion, AnimatePresence } from "framer-motion";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api";
import { PixelButton } from "@/components/pixel-button";
import { Trophy, Home, Upload, RefreshCw, Calendar, Layers } from "lucide-react";

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
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch(rank) {
      case 1: return "bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100";
      case 2: return "bg-slate-50 text-slate-500 border-slate-200 shadow-slate-100";
      case 3: return "bg-orange-50 text-orange-600 border-orange-200 shadow-orange-100";
      default: return "bg-white text-slate-400 border-transparent shadow-none";
    }
  };

  return (
    <div className="text-slate-900 pb-12">
      {/* Sleek Header Navigation */}
      <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Trophy className="text-white w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-xl hidden sm:block">Leaderboard</span>
        </div>
        <div className="flex gap-2">
          <PixelButton href="/upload" variant="secondary" size="sm">
            <Upload size={18} className="mr-1" /> Upload
          </PixelButton>
          <PixelButton href="/" variant="secondary" size="sm">
            <Home size={18} className="mr-1" /> Home
          </PixelButton>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        {/* Filters Bar */}
        <header className="mb-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-3 flex-1 min-w-[300px]">
              <Select
                labelPlacement="outside"
                variant="bordered"
                selectedKeys={[selectedRounds]}
                onChange={(e) => setSelectedRounds(e.target.value)}
                className="max-w-[140px]"
                size="sm"
                startContent={<Layers size={14} className="text-slate-400" />}
              >
                {ROUND_OPTIONS.map((opt) => <SelectItem key={opt.key}>{opt.label}</SelectItem>)}
              </Select>
              <Select
                labelPlacement="outside"
                variant="bordered"
                selectedKeys={[selectedDifficulty]}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="max-w-[160px]"
                size="sm"
                startContent={<Trophy size={14} className="text-slate-400" />}
              >
                {DIFFICULTY_OPTIONS.map((opt) => <SelectItem key={opt.key}>{opt.label}</SelectItem>)}
              </Select>
              <PixelButton 
                variant="secondary" 
                size="sm" 
                onClick={fetchLeaderboard} 
                isLoading={loading}
                className="mt-auto"
              >
                <RefreshCw size={16} />
              </PixelButton>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Spinner color="primary" />
              <p className="text-slate-400 text-sm animate-pulse">Updating rankings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-100 text-red-600 italic">{error}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400">No scores found for these filters.</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden"
            >
              {/* Header Row */}
              <div className="grid grid-cols-12 px-6 py-4 bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <div className="col-span-1">Rank</div>
                <div className="col-span-6 sm:col-span-7">Player</div>
                <div className="col-span-3 sm:col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right hidden sm:block">Date</div>
              </div>

              {/* Player Rows */}
              <div className="divide-y divide-slate-50">
                {entries.map((entry, index) => {
                  const rank = entry.rank || index + 1;
                  return (
                    <motion.div
                      key={entry._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Rank Badge */}
                      <div className="col-span-1">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm ${getRankStyle(rank)}`}>
                          {rank}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="col-span-6 sm:col-span-7 pl-2">
                        <div className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          {entry.username}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{entry.difficulty}</span>
                          <span>•</span>
                          <span>{entry.rounds} ROUNDS</span>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="col-span-3 sm:col-span-2 text-right">
                        <span className="font-black text-lg text-slate-800 tabular-nums">
                          {entry.score.toLocaleString()}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="col-span-2 text-right hidden sm:flex items-center justify-end gap-1.5 text-slate-400">
                        <Calendar size={12} />
                        <span className="text-xs">
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
      </div>
    </div>
  );
}