"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { TrophyIcon, MapPinPlusIcon } from "@/components/Icons/icons";
import { SplitFlapText } from "@/components/Title/split-text";
import {
  useArcadeAudio,
  ArcadeSoundToggle,
} from "@/components/audio/arcade-audio";
import { getLeaderboardHighlights, type LeaderboardEntry } from "@/lib/api";

function ScoreTicker() {
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [recent, setRecent] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let active = true;
    getLeaderboardHighlights(5, 3)
      .then((data) => {
        if (!active) return;
        setTop(data.top);
        setRecent(data.recent);
      })
      .catch(() => {
        /* keep the fallback attract-mode copy on error */
      });
    return () => {
      active = false;
    };
  }, []);

  const hasData = top.length > 0 || recent.length > 0;

  return (
    <div className="arcade-ticker font-mono text-[0.68rem]" aria-hidden="true">
      {hasData ? (
        <span>
          {top.length > 0 && (
            <>
              High Scores &#8226;{" "}
              {top.map((entry, i) => (
                <Fragment key={entry.id}>
                  {i + 1}. {entry.username} &#8212;{" "}
                  <b>{entry.score.toLocaleString()}</b> &#8226;{" "}
                </Fragment>
              ))}
            </>
          )}
          {recent.length > 0 && (
            <>
              Latest &#8226;{" "}
              {recent.map((entry) => (
                <Fragment key={entry.id}>
                  {entry.username} &#8212;{" "}
                  <b>{entry.score.toLocaleString()}</b> &#8226;{" "}
                </Fragment>
              ))}
            </>
          )}
          Press 1P or 2P to start &#8226;
        </span>
      ) : (
        <span>
          Now playing &#8226; Hall Building lobby &#8212; <b>4,820 pts</b>{" "}
          &#8226; McGill Arts quad &#8212; <b>5,000 pts</b> &#8226; Webster
          Library &#8212; <b>3,975 pts</b> &#8226; Press 1P or 2P to start
          &#8226;
        </span>
      )}
    </div>
  );
}

export default function Home() {
  const audio = useArcadeAudio();

  return (
    <>
      {/* Cabinet screen (ground + scanlines + vignette) is provided globally by the layout */}

      {/* Cabinet volume knob */}
      <ArcadeSoundToggle className="fixed right-5 top-5 z-[50]" />

      {/* Foreground UI */}
      <main className="relative z-[2] flex min-h-[calc(100vh-1.5rem)] flex-col items-center justify-center gap-10 px-4 pb-16 text-center">
        {/* Stats (eyebrow) */}
        <div className="flex items-center justify-center gap-4 font-mono text-xs uppercase tracking-[0.28em] text-white/40">
          
          <span>
            <span className="text-[#4ade80]">100+</span> stages
          </span>
          <span className="h-1 w-1 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
          <span>
            <span className="text-[#4ade80]">2</span> campuses
          </span>
          <span className="h-1 w-1 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
                    <span>
            <span className="text-[#4ade80]">LIVE</span> multiplayer
          </span>
        </div>

        {/* Title */}
        <div className="arcade-title-glow">
          <SplitFlapText
            text="UNIGUESSR"
            speed={80}
            fontSize="8rem"
            transparent
            highlightFrom={3}
            highlightColor="#f97316"
          />
        </div>

        {/* Attract-mode line */}
        <p className="arcade-insert-coin font-mono text-sm uppercase">
          &#9668; SELECT GAMEMODE &#9658;
        </p>

        {/* Game Mode Selection — 1P / 2P start */}
        <div className="flex flex-wrap items-stretch justify-center gap-8">
          <Link
            href="/single-player"
            className="arcade-btn font-mono"
            onClick={() => audio?.playStart()}
            onMouseEnter={() => audio?.playSelect()}
          >
            <span className="tag">1P</span>
            <span className="label">Single Player</span>
          </Link>
          <Link
            href="/multiplayer"
            className="arcade-btn arcade-btn--p2 font-mono"
            onClick={() => audio?.playStart()}
            onMouseEnter={() => audio?.playSelect()}
          >
            <span className="tag">2P</span>
            <span className="label">Multiplayer</span>
          </Link>
        </div>

        {/* Secondary actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-xs uppercase tracking-[0.2em]">
          <Link
            href="/leaderboard"
            aria-label="High Scores"
            title="High Scores"
            className="arcade-menu-item"
            onClick={() => audio?.playSelect()}
            onMouseEnter={() => audio?.playSelect()}
          >
            <TrophyIcon className="h-4 w-4" />
            <span>High Scores</span>
          </Link>
          <Link
            href="/upload"
            aria-label="Add a Stage"
            title="Add a Stage"
            className="arcade-menu-item"
            onClick={() => audio?.playSelect()}
            onMouseEnter={() => audio?.playSelect()}
          >
            <MapPinPlusIcon className="h-4 w-4" />
            <span>Add a Stage</span>
          </Link>
        </div>
      </main>

      {/* Attract-mode ticker — real top scores + latest plays */}
      <ScoreTicker />
    </>
  );
}
