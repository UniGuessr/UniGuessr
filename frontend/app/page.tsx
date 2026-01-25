"use client";

import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import BackgroundMap from "@/components/background";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* Background map
      <BackgroundMap /> */}

      {/* Subtle gradient overlay */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

      {/* Foreground UI */}
      <div className="relative z-[2] flex flex-col items-center justify-center px-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-10 text-center mt-50">
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
              Conu<span className="text-emerald-400">Guessr</span>
            </h1>
            <p className="text-base text-white/60 sm:text-lg">
              Guess locations across Concordia University
            </p>
          </div>

          {/* Game Mode Selection */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              as={Link}
              href="/single-player"
              size="lg"
              className="min-w-[160px] bg-white/95 px-6 py-5 font-medium text-gray-900 backdrop-blur-sm transition-all hover:bg-white"
              radius="md"
              variant="bordered"
            >
              Single Player
            </Button>

            <Button
              as={Link}
              href="/multi-player"
              size="lg"
              className="min-w-[160px] border border-white/20 bg-white/10 px-6 py-5 font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
              radius="md"
              variant="bordered"
            >
              Multiplayer
            </Button>
          </div>

          {/* Minimal stats */}
          <div className="flex items-center gap-6 text-sm text-white/40">
            <span>100+ locations</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>2 campuses</span>
          </div>
        </div>
      </div>
    </main>
  );
}