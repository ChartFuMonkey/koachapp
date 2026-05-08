import * as React from "react"

interface RingChartProps {
  percent: number
  color?: string
  size?: number
  stroke?: number
  trackColor?: string
}

function RingChart({
  percent,
  color = "var(--lime)",
  size = 28,
  stroke = 2.5,
  trackColor = "var(--hairline-2)",
}: RingChartProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clampedPercent = Math.max(0, Math.min(100, percent))
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(clampedPercent)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c - (c * clampedPercent) / 100}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 400ms ease-out" }}
      />
    </svg>
  )
}

export { RingChart }
