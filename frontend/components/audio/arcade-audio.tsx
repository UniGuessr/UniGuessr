"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Global arcade sound-effects provider.
 *
 * All SFX are synthesized on the fly with the Web Audio API so there are no
 * audio assets to ship. The AudioContext stays suspended until the first user
 * gesture (browser autoplay policy), then every sound routes through it.
 */

interface ArcadeAudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  /** Short square-wave tick used by the split-flap title as tiles land. */
  playFlap: () => void;
  /** Crisp UI blip for hovering / selecting menu items. */
  playSelect: () => void;
  /** Coin-insert arpeggio for starting a game. */
  playStart: () => void;
  /** Tiny high tick for countdown numbers / low-timer warning. */
  playTick: () => void;
  /** Soft rising two-tone confirmation for submitting a guess. */
  playConfirm: () => void;
  /** Muted low blip for a physical button press (elevator floor buttons). */
  playBoop: () => void;
  /** Soft "plip" when dropping a guess pin on the map. */
  playPin: () => void;
  /** Rapid ascending tally, played as the round score is revealed. */
  playScore: () => void;
}

const ArcadeAudioContext = createContext<ArcadeAudioContextType | null>(null);

const STORAGE_KEY = "conuguessr:sound-muted";

export function useArcadeAudio() {
  return useContext(ArcadeAudioContext);
}

export function ArcadeAudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Restore the saved mute preference on mount (client only).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setIsMuted(stored === "1");
    } catch {
      // localStorage unavailable — keep default.
    }
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    return audioContextRef.current;
  }, []);

  const resume = useCallback((ctx: AudioContext) => {
    if (ctx.state === "suspended") ctx.resume();
  }, []);

  const triggerHaptic = useCallback(
    (ms: number) => {
      if (isMuted) return;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(ms);
      }
    },
    [isMuted],
  );

  // Unlock the audio context on the first interaction anywhere on the page so
  // that non-click sounds (e.g. hovering a letter) can play afterwards.
  useEffect(() => {
    const unlock = () => {
      const ctx = getAudioContext();
      if (ctx) resume(ctx);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [getAudioContext, resume]);

  const playFlap = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(10);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const lowpass = ctx.createBiquadFilter();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(
        800 + Math.random() * 400,
        ctx.currentTime,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        200,
        ctx.currentTime + 0.015,
      );

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.Q.setValueAtTime(0.8, ctx.currentTime);

      lowpass.type = "lowpass";
      lowpass.frequency.value = 2500;
      lowpass.Q.value = 0.5;

      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(lowpass);
      lowpass.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.02);
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const playSelect = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(12);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "square";
      // Quick upward chirp: bright and snappy.
      oscillator.frequency.setValueAtTime(520, now);
      oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.05);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.025, now + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const playStart = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(30);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);
      const now = ctx.currentTime;

      // Classic coin-insert arpeggio (C5, E5, G5, C6).
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const step = 0.075;
      const master = ctx.createGain();
      master.gain.value = 0.08;
      master.connect(ctx.destination);

      notes.forEach((freq, i) => {
        const t = now + i * step;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(1, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + step + 0.06);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + step + 0.08);
      });
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const playTick = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(8);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(1100, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.06);
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const playConfirm = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(15);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.value = 0.05;
      master.connect(ctx.destination);

      // Two quick rising notes (E5 -> B5).
      [
        { f: 659.25, t: 0 },
        { f: 987.77, t: 0.07 },
      ].forEach(({ f, t }) => {
        const start = now + t;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, start);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(1, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
        osc.connect(g);
        g.connect(master);
        osc.start(start);
        osc.stop(start + 0.14);
      });
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const playBoop = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(10);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();

      // Soft, slightly falling pitch for a tactile button feel.
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      lowpass.type = "lowpass";
      lowpass.frequency.value = 1400;

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.035, now + 0.006);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      oscillator.connect(lowpass);
      lowpass.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const playPin = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(12);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Quick "plip" — a short drop in pitch, like a marker snapping down.
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(1200, now);
      oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.06);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.006);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const playScore = useCallback(() => {
    if (isMuted) return;
    triggerHaptic(20);
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      resume(ctx);
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.value = 0.035;
      master.connect(ctx.destination);

      // Rapid ascending blips, like a score counter ticking up.
      const count = 12;
      const step = 0.035;
      for (let i = 0; i < count; i++) {
        const t = now + i * step;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(440 + i * 55, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(1, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.9);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + step);
      }
    } catch {
      // Audio not supported.
    }
  }, [isMuted, getAudioContext, resume, triggerHaptic]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore persistence failures.
      }
      if (!next) {
        // Unmuting counts as a gesture — make sure the context is live.
        const ctx = getAudioContext();
        if (ctx) resume(ctx);
      }
      return next;
    });
  }, [getAudioContext, resume]);

  const value = useMemo(
    () => ({
      isMuted,
      toggleMute,
      playFlap,
      playSelect,
      playStart,
      playTick,
      playConfirm,
      playBoop,
      playPin,
      playScore,
    }),
    [
      isMuted,
      toggleMute,
      playFlap,
      playSelect,
      playStart,
      playTick,
      playConfirm,
      playBoop,
      playPin,
      playScore,
    ],
  );

  return (
    <ArcadeAudioContext.Provider value={value}>
      {children}
    </ArcadeAudioContext.Provider>
  );
}

export function ArcadeSoundToggle({ className = "" }: { className?: string }) {
  const audio = useArcadeAudio();
  if (!audio) return null;

  return (
    <button
      type="button"
      onClick={audio.toggleMute}
      className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50 transition-colors duration-200 hover:text-[#f97316] ${className}`}
      aria-label={audio.isMuted ? "Unmute sound effects" : "Mute sound effects"}
    >
      {audio.isMuted ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      <span>{audio.isMuted ? "Sound Off" : "Sound On"}</span>
    </button>
  );
}
