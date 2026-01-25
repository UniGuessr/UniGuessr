"use client"

import clsx from "clsx"
import * as React from "react"
import Link from "next/link"

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success"
  size?: "sm" | "md" | "lg"
  href?: string
  isLoading?: boolean
}

const variantStyles = {
  primary: {
    main: "bg-blue-500",
    light: "bg-blue-300",
    dark: "bg-blue-700",
    shadow: "bg-blue-900",
    text: "text-white",
  },
  secondary: {
    main: "bg-gray-500",
    light: "bg-gray-300",
    dark: "bg-gray-600",
    shadow: "bg-gray-800",
    text: "text-white",
  },
  danger: {
    main: "bg-red-500",
    light: "bg-red-300",
    dark: "bg-red-700",
    shadow: "bg-red-900",
    text: "text-white",
  },
  success: {
    main: "bg-green-500",
    light: "bg-green-300",
    dark: "bg-green-700",
    shadow: "bg-green-900",
    text: "text-white",
  },
}

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
}

export function PixelButton({
  className,
  variant = "primary",
  size = "md",
  children,
  disabled,
  href,
  isLoading,
  ...props
}: PixelButtonProps) {
  const colors = variantStyles[variant]
  const isDisabled = disabled || isLoading

  const buttonStyle = {
    imageRendering: "pixelated" as const,
    boxShadow: `
      /* Pixel border - top highlight */
      inset 0 -4px 0 0 var(--shadow-color, rgba(0,0,0,0.3)),
      inset 0 4px 0 0 var(--highlight-color, rgba(255,255,255,0.3)),
      inset 4px 0 0 0 var(--highlight-color, rgba(255,255,255,0.2)),
      inset -4px 0 0 0 var(--shadow-color, rgba(0,0,0,0.2)),
      /* Outer pixel shadow */
      4px 4px 0 0 rgba(0,0,0,0.4),
      /* Corner pixels for that authentic look */
      0 4px 0 0 rgba(0,0,0,0.3),
      4px 0 0 0 rgba(0,0,0,0.3)
    `,
    border: "4px solid",
    borderColor: "rgba(0,0,0,0.5) rgba(0,0,0,0.5) rgba(0,0,0,0.7) rgba(0,0,0,0.3)",
  }

  const buttonClasses = clsx(
    "relative inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all",
    "font-mono cursor-pointer select-none",
    colors.main,
    colors.text,
    sizeStyles[size],
    "active:translate-y-1",
    isDisabled && "opacity-50 cursor-not-allowed active:translate-y-0",
    className
  )

  const content = isLoading ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      {children}
    </span>
  ) : children

  if (href) {
    return (
      <Link
        href={href}
        className={buttonClasses}
        style={buttonStyle}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled}
      style={buttonStyle}
      {...props}
    >
      {content}
    </button>
  )
}
