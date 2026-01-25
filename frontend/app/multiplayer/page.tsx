"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { motion } from "framer-motion";
import { PixelButton } from "@/components/pixel-button";
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
    if (!lobbyCode.trim()) {
      setError("Please enter a lobby code");
      return;
    }
    console.log("Joining lobby:", lobbyCode.toUpperCase());
    router.push(`/multiplayer/lobby/${lobbyCode.toUpperCase()}`);
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
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Multiplayer</h1>
          <p className="text-slate-600">Play with friends or find a match</p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 justify-center">
          <PixelButton
            variant={mode === "create" ? "primary" : "secondary"}
            size="sm"
            onPress={() => setMode("create")}
          >
            Create Lobby
          </PixelButton>
          <PixelButton
            variant={mode === "join" ? "primary" : "secondary"}
            size="sm"
            onPress={() => setMode("join")}
          >
            Join Lobby
          </PixelButton>
          <PixelButton
            variant={mode === "matchmaking" ? "primary" : "secondary"}
            size="sm"
            onPress={() => setMode("matchmaking")}
          >
            Quick Match
          </PixelButton>
        </div>

        <Card className="shadow-xl">
          <CardBody className="p-6 space-y-4">
            {mode === "create" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Input
                  label="Your Username"
                  placeholder="Enter username (3-20 chars)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  variant="bordered"
                  minLength={3}
                  maxLength={20}
                />

                <Select
                  label="Rounds"
                  selectedKeys={[rounds.toString()]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    const parsed = parseInt(selected);
                    if (!isNaN(parsed)) {
                      setRounds(parsed);
                    }
                  }}
                  variant="bordered"
                >
                  {ROUND_OPTIONS.map((r) => (
                    <SelectItem key={r.toString()}>{r}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Difficulty"
                  selectedKeys={[difficulty]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setDifficulty(selected as "easy" | "normal" | "hard");
                  }}
                  variant="bordered"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key}>{opt.label}</SelectItem>
                  ))}
                </Select>

                <PixelButton
                  onPress={handleCreateLobby}
                  isLoading={loading}
                  className="w-full"
                  size="lg"
                >
                  <Users className="mr-2" size={20} />
                  Create Lobby
                </PixelButton>
              </motion.div>
            )}

            {mode === "join" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Input
                  label="Lobby Code"
                  placeholder="Enter 6-character code"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                  variant="bordered"
                  maxLength={6}
                  classNames={{
                    input: "uppercase",
                  }}
                />

                <PixelButton
                  onPress={handleJoinLobby}
                  className="w-full"
                  size="lg"
                >
                  <Search className="mr-2" size={20} />
                  Join Lobby
                </PixelButton>
              </motion.div>
            )}

            {mode === "matchmaking" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Input
                  label="Your Username"
                  placeholder="Enter username (3-20 chars)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  variant="bordered"
                  minLength={3}
                  maxLength={20}
                />

                <Select
                  label="Rounds"
                  selectedKeys={[rounds.toString()]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    const parsed = parseInt(selected);
                    if (!isNaN(parsed)) {
                      setRounds(parsed);
                    }
                  }}
                  variant="bordered"
                >
                  {ROUND_OPTIONS.map((r) => (
                    <SelectItem key={r.toString()}>{r}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Difficulty"
                  selectedKeys={[difficulty]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setDifficulty(selected as "easy" | "normal" | "hard");
                  }}
                  variant="bordered"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key}>{opt.label}</SelectItem>
                  ))}
                </Select>

                <PixelButton
                  onPress={handleJoinMatchmaking}
                  isLoading={loading}
                  className="w-full"
                  size="lg"
                >
                  <Loader2 className="mr-2" size={20} />
                  Find Match
                </PixelButton>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100"
              >
                {error}
              </motion.div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
