"use client";

import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import type { Building } from "@/config/buildings";

type FloorSelectorProps = {
  building: Building;
  selectedFloor: number | null;
  onFloorSelect: (floor: number | null) => void;
  size?: "default" | "large";
  className?: string;
};

export default function FloorSelector({
  building,
  selectedFloor,
  onFloorSelect,
  size = "default",
  className,
}: FloorSelectorProps) {
  const handleFloorClick = (floor: number) => {
    // Toggle: clicking the lit floor turns it off again.
    onFloorSelect(selectedFloor === floor ? null : floor);
  };

  const isLarge = size === "large";
  // Elevator panels read top-down: highest floor first.
  const floors = [...building.floors].sort((a, b) => b - a);
  // Pick a column count that keeps the panel to at most 5 rows so it never
  // needs to scroll, regardless of how many floors the building has.
  const columns = Math.min(Math.max(Math.ceil(floors.length / 5), 2), 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={clsx("pointer-events-auto font-mono select-none", className)}
      style={{ width: isLarge ? 300 : 250 }}
    >
      <div
        className="relative overflow-hidden bg-[#0a0a12]/95 backdrop-blur-sm border-4 border-black"
        style={{
          imageRendering: "pixelated",
          boxShadow:
            "4px 4px 0 0 rgba(0,0,0,0.6), 0 0 26px -4px rgba(249,115,22,0.4), inset 0 2px 0 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Header — arcade marquee strip */}
        <div className="relative px-3 py-2 bg-gradient-to-b from-orange-500 to-orange-600 border-b-4 border-black">
          <div className="flex items-center gap-2">
            {/* Power LED */}
            <motion.span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full bg-cyan-300"
              style={{ boxShadow: "0 0 8px 1px rgba(103,232,249,0.9)" }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <h3
              className={clsx(
                "font-bold uppercase tracking-wider text-white truncate",
                isLarge ? "text-sm" : "text-xs"
              )}
              style={{ textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
            >
              {building.name}
            </h3>
          </div>
          <p
            className={clsx(
              "uppercase tracking-[0.2em] text-orange-950/80 font-bold",
              isLarge ? "text-[10px]" : "text-[9px]"
            )}
          >
            &#9668; Select floor &#9658;
          </p>
        </div>

        <div className={clsx("relative", isLarge ? "p-3" : "p-2.5")}>
          {/* Digital floor readout — phosphor CRT segment display */}
          <div
            className="flex items-center justify-center gap-2 mb-3 border-2 border-[#4ade80]/25 bg-black py-2"
            style={{
              boxShadow:
                "inset 0 0 12px rgba(0,0,0,0.95), inset 0 0 10px rgba(74,222,128,0.08)",
            }}
          >
            <span
              className={clsx(
                "text-[#4ade80]/40 tracking-widest",
                isLarge ? "text-base" : "text-sm"
              )}
            >
              FL
            </span>
            <div className="relative h-7 w-12 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={selectedFloor ?? "none"}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={clsx(
                    "absolute inset-0 flex items-center justify-center font-bold tabular-nums",
                    isLarge ? "text-2xl" : "text-xl",
                    selectedFloor !== null ? "text-[#4ade80]" : "text-[#4ade80]/30"
                  )}
                  style={
                    selectedFloor !== null
                      ? { textShadow: "0 0 12px rgba(74,222,128,0.9)" }
                      : undefined
                  }
                >
                  {selectedFloor ?? "--"}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Illuminated arcade-button floor grid */}
          <div
            className={clsx("grid mx-auto w-max", isLarge ? "gap-3" : "gap-2.5")}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {floors.map((floor, i) => {
              const active = selectedFloor === floor;
              return (
                <motion.button
                  key={floor}
                  type="button"
                  onClick={() => handleFloorClick(floor)}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.025 * i,
                    type: "spring",
                    stiffness: 420,
                    damping: 22,
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9, y: 2 }}
                  className={clsx(
                    "relative rounded-full flex items-center justify-center font-bold border-2 transition-colors",
                    isLarge ? "h-12 w-12 text-lg" : "h-11 w-11 text-base",
                    active
                      ? "bg-orange-500 text-white border-orange-200"
                      : "bg-[#161622] text-orange-200/70 border-black hover:bg-[#20202f] hover:text-orange-200"
                  )}
                  style={{
                    boxShadow: active
                      ? "0 0 16px rgba(249,115,22,0.9), inset 0 0 8px rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.35)"
                      : "inset 0 -3px 0 rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Button top-gloss highlight */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-1.5 top-1 h-1/3 rounded-full"
                    style={{
                      background:
                        "linear-gradient(rgba(255,255,255,0.35), transparent)",
                      opacity: active ? 0.9 : 0.25,
                    }}
                  />
                  <span className="relative">{floor}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Bonus hint — pixel chip */}
          <div
            className={clsx(
              "mt-3 flex items-center justify-center gap-1.5 border-2 border-orange-500/40 bg-orange-500/10",
              isLarge ? "py-2" : "py-1.5"
            )}
          >
            <span
              className={clsx(
                "uppercase tracking-[0.15em] text-orange-300 font-bold",
                isLarge ? "text-[11px]" : "text-[9px]"
              )}
            >
              Correct floor
            </span>
            <span
              className={clsx(
                "font-bold text-[#4ade80]",
                isLarge ? "text-xs" : "text-[10px]"
              )}
              style={{ textShadow: "0 0 8px rgba(74,222,128,0.6)" }}
            >
              +20%
            </span>
          </div>
        </div>

        {/* CRT scanline sheen over the whole panel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px)",
            mixBlendMode: "multiply",
            opacity: 0.5,
          }}
        />
      </div>
    </motion.div>
  );
}
