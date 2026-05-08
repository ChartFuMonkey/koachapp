import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Num } from "./num"

const metricVariants = cva(
  "inline-flex items-baseline gap-1 font-mono",
  {
    variants: {
      size: {
        hero: "text-[44px] font-bold tracking-[-0.02em] leading-none",
        large: "text-[28px] font-semibold tracking-[-0.01em] leading-none",
        card: "text-[22px] font-semibold tracking-[-0.005em] leading-none",
        sm: "text-base font-semibold leading-none",
      },
    },
    defaultVariants: {
      size: "card",
    },
  }
)

interface MetricProps extends VariantProps<typeof metricVariants> {
  value: number | null | undefined
  decimals?: number
  unit?: string
  target?: number
  className?: string
}

function Metric({
  value,
  decimals,
  unit,
  target,
  size,
  className,
}: MetricProps) {
  return (
    <div className={cn(metricVariants({ size }), className)}>
      <Num value={value} decimals={decimals} className="font-inherit" />
      {target !== undefined ? (
        <span className="text-ink-3 text-sm font-normal">
          /<Num value={target} decimals={decimals} className="font-inherit" />
          {unit ? ` ${unit}` : null}
        </span>
      ) : unit ? (
        <span className="text-ink-3 text-sm font-normal">{unit}</span>
      ) : null}
    </div>
  )
}

export { Metric, metricVariants }
