import * as React from "react"

import { cn } from "@/lib/utils"

function Kbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-hairline-2 bg-surface-2 px-1 font-mono text-[10px] font-medium text-ink-2",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
