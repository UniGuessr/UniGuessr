"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useMemo, useState, useEffect, useRef } from "react"
import { useArcadeAudio } from "@/components/audio/arcade-audio"

interface SplitFlapTextProps {
  text: string
  className?: string
  speed?: number
  fontSize?: string
  transparent?: boolean
  highlightFrom?: number
  highlightColor?: string
}

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")

function SplitFlapTextInner({ text, className = "", speed = 50, fontSize = "clamp(4rem, 15vw, 14rem)", transparent = false, highlightFrom, highlightColor }: SplitFlapTextProps) {
  const chars = useMemo(() => text.split(""), [text])
  const [hasInitialized, setHasInitialized] = useState(false)
  const audio = useArcadeAudio()

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasInitialized(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`inline-flex gap-[0.08em] items-center ${className}`}
      aria-label={text}
      style={{ perspective: "1000px" }}
    >
      {chars.map((char, index) => (
        <SplitFlapChar
          key={index}
          char={char.toUpperCase()}
          index={index}
          skipEntrance={hasInitialized}
          speed={speed}
          playFlap={audio?.playFlap}
          fontSize={fontSize}
          transparent={transparent}
          customColor={highlightFrom !== undefined && index >= highlightFrom ? highlightColor : undefined}
        />
      ))}
    </div>
  )
}

export function SplitFlapText(props: SplitFlapTextProps) {
  return <SplitFlapTextInner {...props} />
}

interface SplitFlapCharProps {
  char: string
  index: number
  skipEntrance: boolean
  speed: number
  playFlap?: () => void
  fontSize?: string
  transparent?: boolean
  customColor?: string
}

function SplitFlapChar({ char, index, skipEntrance, speed, playFlap, fontSize = "clamp(4rem, 15vw, 14rem)", transparent = false, customColor }: SplitFlapCharProps) {
  const displayChar = CHARSET.includes(char) ? char : " "
  const isSpace = char === " "
  const [currentChar, setCurrentChar] = useState(skipEntrance ? displayChar : " ")
  const [isSettled, setIsSettled] = useState(skipEntrance)
  // Bumped on hover to re-run the flip for this single tile only.
  const [replayKey, setReplayKey] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tileDelay = 0.15 * index

  const bgColor = transparent ? "transparent" : (isSettled ? "hsl(0, 0%, 0%)" : "rgba(249, 115, 22, 0.2)")
  const textColor = isSettled ? (customColor || "#ffffff") : "#f97316"

  const handleMouseEnter = () => {
    if (isSpace) return
    setReplayKey((prev) => prev + 1)
  }

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (isSpace) {
      setCurrentChar(" ")
      setIsSettled(true)
      return
    }

    setIsSettled(false)
    setCurrentChar(CHARSET[Math.floor(Math.random() * CHARSET.length)])

    const baseFlips = 8
    // On the initial reveal, tiles cascade left-to-right; a hover replay flips
    // just this tile with no stagger.
    const isReplay = replayKey > 0
    const startDelay = isReplay ? 0 : (skipEntrance ? tileDelay * 400 : tileDelay * 800)
    const settleThreshold = isReplay ? baseFlips : baseFlips + index * 3
    let flipIndex = 0
    let hasStartedSettling = false

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (flipIndex >= settleThreshold && !hasStartedSettling) {
          hasStartedSettling = true
          if (intervalRef.current) clearInterval(intervalRef.current)
          setCurrentChar(displayChar)
          setIsSettled(true)
          if (playFlap) playFlap()
          return
        }
        setCurrentChar(CHARSET[Math.floor(Math.random() * CHARSET.length)])
        if (flipIndex % 2 === 0 && playFlap) playFlap()
        flipIndex++
      }, speed)
    }, startDelay)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [displayChar, isSpace, tileDelay, replayKey, skipEntrance, index, speed, playFlap])

  if (isSpace) {
    return (
      <div
        style={{
          width: "0.3em",
          fontSize,
        }}
      />
    )
  }

  return (
    <motion.div
      initial={skipEntrance ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tileDelay, duration: 0.3, ease: "easeOut" }}
      onMouseEnter={handleMouseEnter}
      className="relative overflow-hidden flex items-center justify-center font-[family-name:var(--font-bebas)] cursor-pointer"
      style={{
        fontSize,
        width: "0.65em",
        height: "1.05em",
        backgroundColor: bgColor,
        transformStyle: "preserve-3d",
        transition: "background-color 0.15s ease",
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/20 pointer-events-none z-10" />

      <div className="absolute inset-x-0 top-0 bottom-1/2 flex items-end justify-center overflow-hidden">
        <span
          className="block translate-y-[0.52em] leading-none transition-colors duration-150"
          style={{ color: textColor }}
        >
          {currentChar}
        </span>
      </div>

      <div className="absolute inset-x-0 top-1/2 bottom-0 flex items-start justify-center overflow-hidden">
        <span
          className="-translate-y-[0.52em] leading-none transition-colors duration-150"
          style={{ color: textColor }}
        >
          {currentChar}
        </span>
      </div>

      <motion.div
        key={`${replayKey}-${isSettled}`}
        initial={{ rotateX: -90 }}
        animate={{ rotateX: 0 }}
        transition={{
          delay: replayKey > 0 ? 0 : (skipEntrance ? tileDelay * 0.5 : tileDelay + 0.15),
          duration: 0.25,
          ease: [0.22, 0.61, 0.36, 1],
        }}
        className="absolute inset-x-0 top-0 bottom-1/2 origin-bottom overflow-hidden"
        style={{
          backgroundColor: bgColor,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          transition: "background-color 0.15s ease",
        }}
      >
        <div className="flex h-full items-end justify-center">
          <span
            className="translate-y-[0.52em] leading-none transition-colors duration-150"
            style={{ color: textColor }}
          >
            {currentChar}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
