import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-sm border px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-[0.06em] whitespace-nowrap leading-[1.4]",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-ink-2 border-hairline-2",
        accent: "bg-primary text-primary-foreground border-transparent",
        good: "bg-good/10 text-good border-good/30",
        warn: "bg-warn/10 text-warn border-warn/30",
        danger: "bg-danger/10 text-danger border-danger/30",
        info: "bg-info/10 text-info border-info/30",
        ghost: "bg-transparent text-ink-3 border-border",
      },
      size: {
        default: "h-5 px-1.5",
        sm: "h-4 px-1 text-[9px]",
        lg: "h-6 px-2 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
)

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

function Chip({ className, variant, size, ...props }: ChipProps) {
  return (
    <span
      data-slot="chip"
      className={cn(chipVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Chip, chipVariants }
