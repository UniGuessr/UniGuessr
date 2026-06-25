"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardBody, CardHeader } from "@heroui/card";
import type { Building } from "@/config/buildings";

type FloorSelectorProps = {
  building: Building;
  selectedFloor: number | null;
  onFloorSelect: (floor: number | null) => void;
  size?: "default" | "large";
};

export default function FloorSelector({
  building,
  selectedFloor,
  onFloorSelect,
  size = "default",
}: FloorSelectorProps) {
  const handleFloorClick = (floor: number) => {
    // Toggle: if already selected, deselect (set to null)
    if (selectedFloor === floor) {
      onFloorSelect(null);
    } else {
      onFloorSelect(floor);
    }
  };

  const isLarge = size === "large";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: 20 }}
        transition={{ type: "spring", damping: 20 }}
        className="pointer-events-auto"
        style={{ maxWidth: isLarge ? "360px" : "260px" }}
      >
        <Card className="shadow-2xl border-2 border-indigo-200">
          <CardHeader className={`flex flex-col items-center gap-1 ${isLarge ? "pb-3" : "pb-2"} bg-gradient-to-br from-indigo-50 to-purple-50`}>
            <div className="text-center">
              <h3 className={isLarge ? "text-base font-bold text-slate-800" : "text-sm font-bold text-slate-800"}>
                {building.name}
              </h3>
              <p className={isLarge ? "text-xs text-slate-600 mt-0.5" : "text-[10px] text-slate-600 mt-0.5"}>
                Select floor for bonus
              </p>
            </div>
          </CardHeader>

          <CardBody className={`gap-2 ${isLarge ? "p-4" : "p-3"}`}>
            {/* Floor selection grid */}
            <div className={`grid grid-cols-5 ${isLarge ? "gap-2" : "gap-1.5"}`}>
              {building.floors.map((floor) => (
                <button
                  key={floor}
                  onClick={() => handleFloorClick(floor)}
                  className={`
                    aspect-square rounded-lg font-bold transition-all
                    ${isLarge ? "text-sm" : "text-xs"}
                    ${
                      selectedFloor === floor
                        ? "bg-indigo-600 text-white shadow-lg scale-105 ring-2 ring-indigo-400"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105"
                    }
                  `}
                >
                  {floor}
                </button>
              ))}
            </div>

            {/* Info message */}
            <div className={`text-center ${isLarge ? "p-2" : "p-1.5"} bg-blue-50 rounded-lg border border-blue-100`}>
              <p className={isLarge ? "text-xs text-blue-700 font-medium" : "text-[10px] text-blue-700 font-medium"}>
                Correct = <strong>+20% bonus</strong>
              </p>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
