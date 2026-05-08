import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  size?: "thin" | "default" | "thick"
  color?: string
  trackColor?: string
}

function ProgressBar({
  value,
  max = 100,
  size = "default",
  color = "var(--lime)",
  trackColor = "var(--hairline)",
  className,
  ...props
}: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  const heights = { thin: "h-1", default: "h-1.5", thick: "h-2" }
  return (
    <div
      data-slot="progress-bar"
      className={cn(
        "w-full overflow-hidden rounded-full",
        heights[size],
        className
      )}
      style={{ backgroundColor: trackColor }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all duration-400"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  )
}

interface StackedMacroBarProps extends React.HTMLAttributes<HTMLDivElement> {
  protein: number
  carb: number
  fat: number
  size?: "thin" | "default" | "thick"
}

function StackedMacroBar({
  protein,
  carb,
  fat,
  size = "default",
  className,
  ...props
}: StackedMacroBarProps) {
  const total = protein + carb + fat || 1
  const heights = { thin: "h-1", default: "h-1.5", thick: "h-2" }
  return (
    <div
      data-slot="stacked-macro-bar"
      className={cn(
        "w-full overflow-hidden rounded-full bg-hairline flex",
        heights[size],
        className
      )}
      {...props}
    >
      <div
        className="h-full"
        style={{
          width: `${(protein / total) * 100}%`,
          backgroundColor: "var(--protein)",
        }}
      />
      <div
        className="h-full"
        style={{
          width: `${(carb / total) * 100}%`,
          backgroundColor: "var(--carb)",
        }}
      />
      <div
        className="h-full"
        style={{
          width: `${(fat / total) * 100}%`,
          backgroundColor: "var(--fat)",
        }}
      />
    </div>
  )
}

export { ProgressBar, StackedMacroBar }
