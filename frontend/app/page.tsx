"use client";

import { Link } from "@heroui/link";
import { PixelButton } from "@/components/Button/pixel-button";
import { TrophyIcon, MapPinPlusIcon } from "@/components/Icons/icons";
import {
  SplitFlapText,
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
            {/* Stats (eyebrow) */}
            <div className="flex items-center justify-center gap-6 text-xs text-white/40 font-mono uppercase tracking-wider">
              <span>100+ locations</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>2 campuses</span>
            </div>

            <SplitFlapAudioProvider>
              <SplitFlapText
                text="UNIGUESSR"
                speed={80}
                fontSize="8rem"
                transparent
                highlightFrom={3}
                highlightColor="#f97316"
              />
            </SplitFlapAudioProvider>
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

          {/* Secondary actions */}
          <div className="inline-grid grid-cols-2 items-stretch rounded-none border-2 border-white/25 bg-white/5 text-xs font-mono uppercase tracking-wider divide-x-2 divide-white/25">
            <Link
              href="/leaderboard"
              aria-label="Leaderboard"
              title="Leaderboard"
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-white/60 leading-none transition-colors hover:bg-orange-400/10 hover:text-orange-400"
            >
              <TrophyIcon className="h-6 w-6 shrink-0 text-orange-400/90" />
              <span>Leaderboard</span>
            </Link>
            <Link
              href="/upload"
              aria-label="Submit a Location"
              title="Submit a Location"
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-white/60 leading-none transition-colors hover:bg-orange-400/10 hover:text-orange-400"
            >
              <MapPinPlusIcon className="h-6 w-6 shrink-0 text-orange-400/90" />
              <span>Submit a Location</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
