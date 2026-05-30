import * as React from "react"
import { cn } from "@/lib/utils"

interface AdherenceBarsProps {
  values: number[]
  className?: string
  height?: number
}

function colorFor(pct: number): string {
  if (pct >= 80) return "var(--lime)"
  if (pct >= 60) return "var(--warn)"
  return "var(--danger)"
}

function AdherenceBars({ values, className, height = 100 }: AdherenceBarsProps) {
  return (
    <div
      data-slot="adherence-bars"
      className={cn("flex items-end gap-1", className)}
      style={{ height }}
      role="img"
      aria-label="Adherence — 14 day"
    >
      {values.map((v, i) => {
        const clamped = Math.max(0, Math.min(100, v))
        const isLast = i === values.length - 1
        return (
          <div
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: `${clamped}%`,
              minHeight: clamped > 0 ? 2 : 0,
              background: colorFor(clamped),
              opacity: isLast ? 1 : 0.6,
            }}
          />
        )
      })}
    </div>
  )
}

export { AdherenceBars }
