"use client";

import { Link } from "@heroui/link";
import { PixelButton } from "@/components/Button/pixel-button";
import {
  SplitFlapText,
  SplitFlapMuteToggle,
  SplitFlapAudioProvider,
} from "@/components/Title/split-text";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* Foreground UI */}
      <div className="relative z-[2] flex flex-col items-center justify-center px-6">
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
                  highlightColor="#f97316"
                />
                <div className="mt-2">
                  <SplitFlapMuteToggle />
                </div>
              </div>
            </SplitFlapAudioProvider>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 text-xs text-white/40 font-mono uppercase tracking-wider">
              <span>100+ locations</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>2 campuses</span>
            </div>

            {/* Links (optically centered to match SplitFlapText) */}
            <div className="flex items-center justify-center gap-6 text-xs text-white/40 font-mono uppercase tracking-wider ml-11">
              <Link href="/leaderboard" className="hover:text-orange-400 transition-colors leading-none">
                Leaderboard
              </Link>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <Link href="/upload" className="hover:text-orange-400 transition-colors leading-none">
                Submit a Location
              </Link>
            </div>
          </div>

          {/* Game Mode Selection */}
          <div className="w-full flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
            <PixelButton href="/single-player" size="lg" variant="secondary">
              Single Player
            </PixelButton>
            <PixelButton
              href="/multiplayer"
              size="lg"
              variant="secondary"
            >
              Multiplayer
            </PixelButton>
          </div>
        </div>
      </div>
    </main>
  );
}
