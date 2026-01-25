"use client";

import { Link } from "@heroui/link";
import { PixelButton } from "@/components/pixel-button";
import { SplitFlapText, SplitFlapMuteToggle, SplitFlapAudioProvider } from "@/components/split-text"

// import BackgroundMap from "@/components/background";

export default function Home() {
  return (
    <main className="relative overflow-hidden">

      {/* Subtle gradient overlay */}
      <div />

      {/* Foreground UI */}
      <div className="relative z-[2] flex flex-col items-center justify-center px-6">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-10 text-center mt-50">
          {/* Title */}
          <div className="space-y-3">
            <SplitFlapAudioProvider>
              <div className="relative">
                <SplitFlapText 
                  text="ConUGuessr" 
                  speed={80} 
                  fontSize="8rem"
                  transparent
                  highlightFrom={4}
                  highlightColor="#6b7280"
                />
                <div className="mt-2">
                  <SplitFlapMuteToggle />
                </div>
              </div>
            </SplitFlapAudioProvider>
            <p className="text-base text-white/60 sm:text-lg">
              Guess locations across Concordia University
            </p>
          </div>

          {/* Game Mode Selection */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <PixelButton
              href="/single-player"
              size="lg"
              variant="secondary"
            >
              Single Player
            </PixelButton>

            <PixelButton
              href="/multi-player"
              size="lg"
              variant="secondary"
            >
              Multiplayer
            </PixelButton>
          </div>

          {/* Minimal stats */}
          <div className="flex items-center gap-6 text-sm text-white/40">
            <span>100+ locations</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>2 campuses</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/40">
              <Link href="/leaderboard">Leaderboard</Link>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <Link href="/upload">Submit a Location</Link>
            </div>
        </div>
      </div>
    </main>
  );
}