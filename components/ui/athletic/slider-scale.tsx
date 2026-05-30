"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface SliderScaleProps {
  label: string
  value: number | null | undefined
  onChange?: (value: number) => void
  max?: number
  color?: string
  className?: string
  ariaLabel?: string
}

function SliderScale({
  label,
  value,
  onChange,
  max = 10,
  color = "var(--lime)",
  className,
  ariaLabel,
}: SliderScaleProps) {
  const filled = value == null ? 0 : Math.max(0, Math.min(max, value))
  const bars = Array.from({ length: max }, (_, i) => i + 1)
  const interactive = typeof onChange === "function"
  return (
    <div data-slot="slider-scale" className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span
          className="font-mono text-sm font-semibold tabular-nums"
          style={{ color: value == null ? "var(--ink-3)" : color }}
        >
          {value == null ? "—" : value}
          <span className="text-[10px] text-ink-3 ml-0.5">/{max}</span>
        </span>
      </div>
      <div
        role={interactive ? "slider" : "img"}
        aria-label={ariaLabel ?? label}
        aria-valuenow={value ?? undefined}
        aria-valuemin={1}
        aria-valuemax={max}
        className="flex gap-[3px]"
      >
        {bars.map((n) => {
          const isOn = n <= filled
          const cellProps = interactive
            ? {
                role: "button" as const,
                tabIndex: 0,
                onClick: () => onChange?.(n),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onChange?.(n)
                  }
                },
                "aria-label": `${label} ${n} of ${max}`,
                style: {
                  background: isOn ? color : "var(--hairline)",
                  cursor: "pointer",
                },
              }
            : {
                style: {
                  background: isOn ? color : "var(--hairline)",
                },
              }
          return (
            <div
              key={n}
              className={cn("h-2 flex-1 rounded-[2px]", interactive && "transition-colors")}
              {...cellProps}
            />
          )
        })}
      </div>
    </div>
  )
}

export { SliderScale }
