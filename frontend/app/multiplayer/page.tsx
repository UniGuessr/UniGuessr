"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@heroui/input";
import { Link } from "@heroui/link";
import { motion, AnimatePresence } from "framer-motion";
import { PixelButton } from "@/components/Button/pixel-button";
import {
  createLobby,
  joinMatchmaking,
  type Lobby,
} from "@/lib/multiplayer-api";
import { Users, Search, Loader2 } from "lucide-react";

const DIFFICULTY_OPTIONS = [
  { key: "easy", label: "Easy" },
  { key: "normal", label: "Normal" },
  { key: "hard", label: "Hard" },
];

const ROUND_OPTIONS = [3, 5, 10];

export default function MultiplayerPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [rounds, setRounds] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("easy");
  const [lobbyCode, setLobbyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "join" | "matchmaking">("create");

  const handleCreateLobby = async () => {
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createLobby(rounds, difficulty, username, false);
      router.push(`/multiplayer/lobby/${result.code}?player_id=${result.host_id}&username=${encodeURIComponent(username)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lobby");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = () => {
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (!lobbyCode.trim()) {
      setError("Please enter a lobby code");
      return;
    }
    console.log("Joining lobby:", lobbyCode.toUpperCase());
    router.push(`/multiplayer/lobby/${lobbyCode.toUpperCase()}?username=${encodeURIComponent(username)}`);
  };

  const handleJoinMatchmaking = async () => {
    if (!username.trim() || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Joining matchmaking:", { username, rounds, difficulty });
      const result = await joinMatchmaking(username, rounds, difficulty);
      console.log("Matchmaking result:", result);
      router.push(`/multiplayer/lobby/${result.code}?player_id=${result.player_id}&username=${encodeURIComponent(username)}`);
    } catch (err) {
      console.error("Matchmaking error:", err);
      setError(err instanceof Error ? err.message : "Failed to join matchmaking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key="multiplayer-setup"
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
                <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wider">Multiplayer</h1>
                <p className="text-xs text-white/50 font-mono uppercase tracking-wider">Play with friends or find a match</p>
              </div>

              {/* Mode selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className={`flex-1 py-3 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    mode === "create"
                      ? "bg-white/10 text-white border border-white/20"
                      : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                  }`}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setMode("join")}
                  className={`flex-1 py-3 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    mode === "join"
                      ? "bg-white/10 text-white border border-white/20"
                      : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                  }`}
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => setMode("matchmaking")}
                  className={`flex-1 py-3 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    mode === "matchmaking"
                      ? "bg-white/10 text-white border border-white/20"
                      : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                  }`}
                >
                  Quick
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6">
                {mode === "create" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Username Input */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Username</span>
                      <Input
                        placeholder="Enter username (3-20 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        minLength={3}
                        maxLength={20}
                        classNames={{
                          inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10 data-[hover=true]:bg-white/10",
                          input: "text-white placeholder:text-white/30",
                        }}
                      />
                    </div>

                    {/* Rounds */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Rounds</span>
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

                    {/* Difficulty */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Difficulty</span>
                      <div className="flex gap-2">
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setDifficulty(opt.key as "easy" | "normal" | "hard")}
                            className={`flex-1 py-3 rounded-lg text-sm font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                              difficulty === opt.key
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {mode === "join" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Username Input */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Username</span>
                      <Input
                        placeholder="Enter username (3-20 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        minLength={3}
                        maxLength={20}
                        classNames={{
                          inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10 data-[hover=true]:bg-white/10",
                          input: "text-white placeholder:text-white/30",
                        }}
                      />
                    </div>

                    {/* Lobby Code Input */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Lobby Code</span>
                      <Input
                        placeholder="Enter 6-character code"
                        value={lobbyCode}
                        onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        classNames={{
                          inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10 data-[hover=true]:bg-white/10",
                          input: "text-white placeholder:text-white/30 uppercase",
                        }}
                      />
                    </div>
                  </motion.div>
                )}

                {mode === "matchmaking" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Username Input */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Username</span>
                      <Input
                        placeholder="Enter username (3-20 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        minLength={3}
                        maxLength={20}
                        classNames={{
                          inputWrapper: "bg-white/5 border border-white/10 hover:bg-white/10 data-[hover=true]:bg-white/10",
                          input: "text-white placeholder:text-white/30",
                        }}
                      />
                    </div>

                    {/* Rounds */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Rounds</span>
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

                    {/* Difficulty */}
                    <div className="space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40">Difficulty</span>
                      <div className="flex gap-2">
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setDifficulty(opt.key as "easy" | "normal" | "hard")}
                            className={`flex-1 py-3 rounded-lg text-sm font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                              difficulty === opt.key
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
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
                {mode === "create" && (
                  <PixelButton
                    size="lg"
                    className="w-full"
                    onClick={handleCreateLobby}
                    isLoading={loading}
                    variant="secondary"
                  >
                    <Users className="mr-2" size={20} />
                    Create Lobby
                  </PixelButton>
                )}

                {mode === "join" && (
                  <PixelButton
                    size="lg"
                    className="w-full"
                    onClick={handleJoinLobby}
                    isLoading={loading}
                    variant="secondary"
                  >
                    <Search className="mr-2" size={20} />
                    Join Lobby
                  </PixelButton>
                )}

                {mode === "matchmaking" && (
                  <PixelButton
                    size="lg"
                    className="w-full"
                    onClick={handleJoinMatchmaking}
                    isLoading={loading}
                    variant="secondary"
                  >
                    <Loader2 className="mr-2" size={20} />
                    Find Match
                  </PixelButton>
                )}

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
      </AnimatePresence>
    </div>
  );
}
