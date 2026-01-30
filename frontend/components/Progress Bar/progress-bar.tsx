"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import clsx from "clsx"

interface Star {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  twinkleDelay: number
}

interface SpaceTimerBarProps {
  duration?: number
  className?: string
  onComplete?: () => void
}

export function SpaceTimerBar({
  duration = 30,
  className,
  onComplete,
}: SpaceTimerBarProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(100)

  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      twinkleDelay: Math.random() * 3,
    }))
  }, [])

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 0.1
        if (newTime <= 0) {
          setIsRunning(false)
          onComplete?.()
          return 0
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, timeLeft, onComplete])

  useEffect(() => {
    setProgress((timeLeft / duration) * 100)
  }, [timeLeft, duration])

  const handleStart = useCallback(() => {
    setIsRunning(true)
  }, [])

  const handlePause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(duration)
    setProgress(100)
  }, [duration])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`
  }

  return (
    <div className={clsx("w-full max-w-2xl mx-auto", className)}>
      {/* Timer Display */}


      {/* Timer Bar Container */}
      <div className="relative">
        {/* Outer glow */}
        <div
          className="absolute -inset-1 rounded-full opacity-60 blur-md transition-all duration-300"
          style={{
            background: `linear-gradient(90deg, 
              rgba(249, 115, 22, ${0.3 + progress / 100 * 0.5}) 0%, 
              rgba(249, 115, 22, ${0.4 + progress / 100 * 0.4}) ${progress}%, 
              transparent ${progress}%)`,
          }}
        />

        {/* Main bar background */}
        <div className="relative h-4 md:h-5 rounded-full bg-secondary/50 backdrop-blur-sm border border-border overflow-hidden">
          {/* Starfield background */}
    

          {/* Progress bar */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, 
                hsl(${21 + (1 - progress / 100) * 15}, ${90 - (1 - progress / 100) * 30}%, ${Math.max(25, 55 - (1 - progress / 100) * 35)}%) 0%, 
                #f97316 50%, 
                hsl(${24 + progress / 100 * 5}, 95%, ${60 + progress / 100 * 5}%) 100%)`,
              boxShadow: `
                0 0 20px rgba(249, 115, 22, ${0.3 + progress / 100 * 0.4}),
                0 0 40px rgba(249, 115, 22, ${0.2 + progress / 100 * 0.2}),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `,
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{
                background: `linear-gradient(
                  90deg, 
                  transparent 0%, 
                  rgba(255, 255, 255, 0.1) 50%, 
                  transparent 100%
                )`,
                animation: "shimmer 2s infinite linear",
              }}
            />

            {/* Trailing particles */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{
                background: "radial-gradient(circle, #fff 0%, transparent 70%)",
                boxShadow: `
                  0 0 10px #fff,
                  0 0 20px rgba(249, 115, 22, 0.8),
                  0 0 30px rgba(251, 146, 60, 0.6)
                `,
                animation: "pulse 1s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      {/* Progress percentage */}
      <div className="flex justify-between mt-4 text-sm text-muted-foreground">
        <span>0%</span>
        <span className="font-medium text-foreground">
          {Math.round(progress)}% remaining
        </span>
        <span>100%</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-8">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={timeLeft <= 0}
            className="px-8 py-3 rounded-full font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
              boxShadow: "0 4px 20px rgba(249, 115, 22, 0.4)",
              color: "white",
            }}
          >
            {timeLeft <= 0 ? "Complete" : "Launch"}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="px-8 py-3 rounded-full font-medium transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
              boxShadow: "0 4px 20px rgba(234, 88, 12, 0.4)",
              color: "white",
            }}
          >
            Hold
          </button>
        )}
        <button
          onClick={handleReset}
          className="px-8 py-3 rounded-full font-medium bg-secondary text-secondary-foreground border border-border transition-all duration-300 hover:bg-secondary/80"
        >
          Reset
        </button>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: translateY(-50%) scale(1.3);
          }
        }
      `}</style>
    </div>
  )
}
