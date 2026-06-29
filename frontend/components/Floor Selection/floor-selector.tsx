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
        className="overflow-hidden bg-slate-900/95 backdrop-blur-sm border-4 border-slate-950"
        style={{
          boxShadow:
            "4px 4px 0 0 rgba(0,0,0,0.5), inset 0 2px 0 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 border-b-4 border-slate-950">
          <h3
            className={clsx(
              "font-bold uppercase tracking-wider text-white truncate",
              isLarge ? "text-sm" : "text-xs"
            )}
          >
            {building.name}
          </h3>
          <p
            className={clsx(
              "uppercase tracking-wider text-indigo-200",
              isLarge ? "text-[10px]" : "text-[9px]"
            )}
          >
            Select your floor
          </p>
        </div>

        <div className={isLarge ? "p-3" : "p-2.5"}>
          {/* Digital floor readout */}
          <div
            className="flex items-center justify-center gap-2 mb-3 border-2 border-slate-700 bg-black py-2"
            style={{ boxShadow: "inset 0 0 10px rgba(0,0,0,0.9)" }}
          >
            <span
              className={clsx(
                "text-emerald-500/40",
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
                    selectedFloor !== null ? "text-emerald-400" : "text-emerald-700"
                  )}
                  style={
                    selectedFloor !== null
                      ? { textShadow: "0 0 10px rgba(52,211,153,0.8)" }
                      : undefined
                  }
                >
                  {selectedFloor ?? "--"}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Elevator button grid */}
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
                  whileTap={{ scale: 0.9 }}
                  className={clsx(
                    "relative rounded-full flex items-center justify-center font-bold border-2 transition-colors",
                    isLarge ? "h-12 w-12 text-lg" : "h-11 w-11 text-base",
                    active
                      ? "bg-indigo-500 text-white border-indigo-200"
                      : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                  )}
                  style={{
                    boxShadow: active
                      ? "0 0 14px rgba(99,102,241,0.9), inset 0 0 6px rgba(255,255,255,0.35)"
                      : "inset 0 -2px 4px rgba(0,0,0,0.4)",
                  }}
                >
                  {floor}
                </motion.button>
              );
            })}
          </div>

          {/* Bonus hint */}
          <div
            className={clsx(
              "mt-3 flex items-center justify-center gap-1.5 border-2 border-indigo-500/40 bg-indigo-500/10",
              isLarge ? "py-2" : "py-1.5"
            )}
          >
            <span className={isLarge ? "text-xs" : "text-[10px]"}>▸</span>
            <span
              className={clsx(
                "uppercase tracking-wider text-indigo-300 font-bold",
                isLarge ? "text-[11px]" : "text-[9px]"
              )}
            >
              Correct floor
            </span>
            <span
              className={clsx(
                "font-bold text-emerald-400",
                isLarge ? "text-xs" : "text-[10px]"
              )}
            >
              +20%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
