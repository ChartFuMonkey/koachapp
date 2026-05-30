"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LineChartProps {
  data: number[]
  color?: string
  gradientId?: string
  height?: number
  className?: string
  showGrid?: boolean
  ariaLabel?: string
}

function LineChart({
  data,
  color = "var(--lime)",
  gradientId,
  height = 160,
  className,
  showGrid = true,
  ariaLabel,
}: LineChartProps) {
  const id = React.useId()
  const grad = gradientId ?? `line-grad-${id}`
  if (data.length === 0) return null

  const width = 600
  const padding = 6
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
  const points = data.map((v, i) => {
    const x = padding + i * step
    const y =
      height - padding - ((v - min) / range) * (height - padding * 2)
    return [x, y] as const
  })
  const polyline = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `M ${points[0][0]},${points[0][1]} ${points
    .slice(1)
    .map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ")} L ${points[points.length - 1][0]},${height} L ${points[0][0]},${height} Z`

  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height }}
      className={cn(className)}
      role="img"
      aria-label={ariaLabel ?? "Line chart"}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGrid && [0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={0}
          x2={width}
          y1={height * p}
          y2={height * p}
          stroke="var(--hairline)"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill={`url(#${grad})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={8} fill={color} fillOpacity={0.2} />
      <circle cx={last[0]} cy={last[1]} r={4} fill={color} />
    </svg>
  )
}

export { LineChart }
