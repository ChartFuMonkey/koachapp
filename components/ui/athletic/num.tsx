"use client"

import * as React from "react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"

interface NumProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | null | undefined
  decimals?: number
  unit?: string
  fallback?: string
}

function Num({
  value,
  decimals,
  unit,
  fallback = "—",
  className,
  ...props
}: NumProps) {
  const locale = useLocale()
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span className={cn("font-mono", className)} {...props}>
        {fallback}
        {unit ? <span className="text-ink-3 ml-0.5">{unit}</span> : null}
      </span>
    )
  }
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (
    <span
      data-slot="num"
      className={cn("font-mono", className)}
      style={{ fontFeatureSettings: '"tnum"' }}
      {...props}
    >
      {formatter.format(value)}
      {unit ? <span className="text-ink-3 ml-0.5">{unit}</span> : null}
    </span>
  )
}

export { Num }
