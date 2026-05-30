"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface SegmentedOption<T extends string | number> {
  value: T
  label: React.ReactNode
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[]
  value: T
  onChange?: (value: T) => void
  size?: "sm" | "default"
  className?: string
  ariaLabel?: string
}

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = "default",
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="segmented-control"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-surface-1 p-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              "rounded-[5px] font-mono font-medium uppercase tracking-[0.06em] transition-colors duration-fast",
              size === "sm"
                ? "h-6 px-2 text-[10px]"
                : "h-7 px-3 text-[11px]",
              active
                ? "bg-lime text-bg"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
