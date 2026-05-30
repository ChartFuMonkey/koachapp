"use client"

import * as React from "react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"

interface NumProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | null | undefined
  decimals?: number
  unit?: string
  fallback?: string
  /**
   * Optional full unit name for screen-reader pronunciation per §22 Accessibility.
   * Spec: "Provide spoken-form alternatives — '82.4 kilograms', not 'eighty-two point four k'".
   */
  spokenUnit?: string
}

const SPOKEN_UNIT_MAP: Record<string, string> = {
  kg: "kilograms",
  g: "grams",
  h: "hours",
  hr: "hours",
  hrs: "hours",
  min: "minutes",
  kcal: "kilocalories",
  cal: "calories",
  l: "liters",
  ml: "milliliters",
  cm: "centimeters",
  mm: "millimeters",
  km: "kilometers",
  "%": "percent",
}

function spokenForUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined
  const k = unit.toLowerCase().replace(/[^a-z%]/g, "")
  return SPOKEN_UNIT_MAP[k] ?? unit
}

function Num({
  value,
  decimals,
  unit,
  fallback = "—",
  spokenUnit,
  className,
  ...props
}: NumProps) {
  const locale = useLocale()
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span
        className={cn("font-mono", className)}
        aria-label={spokenUnit ?? spokenForUnit(unit) ?? "no data"}
        {...props}
      >
        {fallback}
        {unit ? <span className="text-ink-3 ml-0.5">{unit}</span> : null}
      </span>
    )
  }
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const spoken = spokenUnit ?? spokenForUnit(unit)
  const ariaLabel = spoken ? `${value} ${spoken}` : undefined
  return (
    <span
      data-slot="num"
      className={cn("font-mono", className)}
      style={{ fontFeatureSettings: '"tnum"' }}
      aria-label={ariaLabel}
      {...props}
    >
      <span aria-hidden={ariaLabel != null}>{formatter.format(value)}</span>
      {unit ? <span aria-hidden className="text-ink-3 ml-0.5">{unit}</span> : null}
    </span>
  )
}

export { Num }
