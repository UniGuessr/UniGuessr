"use client"

import { useEffect, useRef, useState } from "react"

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  blinkSpeed: number
  blinkDirection: number
}

interface StarFieldProps {
  blurAmount?: number
}

export function StarField({ blurAmount = 0 }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationRef = useRef<number>()
  const lastWidthRef = useRef<number>(0)
  const lastHeightRef = useRef<number>(0)
  const [initialHeight, setInitialHeight] = useState<number>(0)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Generate stars with density based on device type
    const generateStars = () => {
      if (!canvas) return
      // Reduce star density on mobile
      const densityFactor = isMobile ? 1500 : 1000
      const starCount = Math.floor((canvas.width * canvas.height) / densityFactor)
      const stars: Star[] = []

      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * (isMobile ? 1.5 : 2) + 0.5,
          opacity: Math.random(),
          blinkSpeed: Math.random() * 0.02 + 0.005,
          blinkDirection: Math.random() > 0.5 ? 1 : -1,
        })
      }

      starsRef.current = stars
    }

    // Store initial window height on first render
    if (initialHeight === 0) {
      const height = window.innerHeight
      setInitialHeight(height)

      // Set initial canvas size to this fixed height
      canvas.height = height
      canvas.width = window.innerWidth

      lastWidthRef.current = window.innerWidth
      lastHeightRef.current = height

      generateStars()
    }

    // Draw stars
    const drawStars = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      starsRef.current.forEach((star) => {
        // Update star blinking
        star.opacity += star.blinkSpeed * star.blinkDirection

        // Change direction if opacity reaches limits
        if (star.opacity >= 1 || star.opacity <= 0.1) {
          star.blinkDirection *= -1
        }

        // Draw star
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(drawStars)
    }

    // Only handle width changes, ignore height changes completely
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      resizeTimeoutRef.current = setTimeout(
        () => {
          // Only update if width changed significantly
          if (Math.abs(window.innerWidth - lastWidthRef.current) > 50) {
            canvas.width = window.innerWidth
            // Keep the height fixed to initial height
            canvas.height = initialHeight

            lastWidthRef.current = window.innerWidth
            // Height remains constant

            generateStars()
          }
        },
        isMobile ? 500 : 250,
      )
    }

    // Initialize
    window.addEventListener("resize", handleResize)
    drawStars()

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isMobile, initialHeight])

  // Apply blur filter based on the blur amount with a smoother transition
  const blurStyle = {
    filter: `blur(${blurAmount}px)`,
    transition: "filter 0.2s ease-out", // Slightly longer transition for smoother effect
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full"
      style={{
        ...blurStyle,
        height: initialHeight ? `${initialHeight}px` : '100vh', // Use fixed height based on initial viewport
      }}
      aria-hidden="true"
    />
  )
}
