import * as React from "react"

import { cn } from "@/lib/utils"

function MicroLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="micro-label"
      className={cn(
        "font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3",
        className
      )}
      {...props}
    />
  )
}

export { MicroLabel }
