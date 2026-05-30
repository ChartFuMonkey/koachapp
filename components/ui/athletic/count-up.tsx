"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CountUpProps {
  value: number | null | undefined
  decimals?: number
  duration?: number
  className?: string
  format?: (n: number) => string
}

/**
 * Counter roll — animates from previous value to new value over 400ms linear.
 * Used for hero numbers like the energy budget. Respects prefers-reduced-motion.
 */
function CountUp({
  value,
  decimals = 0,
  duration = 400,
  className,
  format,
}: CountUpProps) {
  const [display, setDisplay] = React.useState<number>(value ?? 0)
  const rafRef = React.useRef<number | null>(null)
  const startRef = React.useRef<number>(0)
  const fromRef = React.useRef<number>(0)
  const toRef = React.useRef<number>(value ?? 0)
  const prefersReducedMotion = React.useRef(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  }, [])

  React.useEffect(() => {
    if (value == null || Number.isNaN(value)) return
    if (prefersReducedMotion.current) {
      setDisplay(value)
      return
    }
    fromRef.current = display
    toRef.current = value
    startRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const t = Math.min(1, elapsed / duration)
      const next = fromRef.current + (toRef.current - fromRef.current) * t
      setDisplay(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  if (value == null || Number.isNaN(value)) {
    return <span className={cn("font-mono tabular-nums", className)}>—</span>
  }

  const formatted = format
    ? format(display)
    : display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

  return (
    <span
      className={cn("font-mono tabular-nums", className)}
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      {formatted}
    </span>
  )
}

export { CountUp }
