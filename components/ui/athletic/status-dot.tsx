import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusDotVariants = cva("inline-block rounded-full shrink-0", {
  variants: {
    tone: {
      good: "bg-good",
      warn: "bg-warn",
      danger: "bg-danger",
      neutral: "bg-ink-3",
      info: "bg-info",
    },
    size: {
      sm: "size-1.5",
      default: "size-2",
      lg: "size-2.5",
    },
  },
  defaultVariants: {
    tone: "good",
    size: "default",
  },
})

interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  glow?: boolean
}

function StatusDot({
  tone,
  size,
  glow = true,
  className,
  style,
  ...props
}: StatusDotProps) {
  const glowColors: Record<string, string> = {
    good: "rgba(61, 232, 160, 0.4)",
    warn: "rgba(255, 138, 61, 0.4)",
    danger: "rgba(255, 92, 92, 0.4)",
    info: "rgba(125, 211, 252, 0.4)",
    neutral: "rgba(90, 98, 112, 0.3)",
  }
  return (
    <span
      data-slot="status-dot"
      className={cn(statusDotVariants({ tone, size }), className)}
      style={{
        ...style,
        boxShadow: glow ? `0 0 8px ${glowColors[tone ?? "good"]}` : undefined,
      }}
      {...props}
    />
  )
}

export { StatusDot, statusDotVariants }
