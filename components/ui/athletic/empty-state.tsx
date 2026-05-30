import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  glyph?: string
  label: string
  hint?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Standardized empty state per Design Guidelines §20.
 * Pattern: dashed border card with low-opacity unicode glyph + label + mono UC hint.
 */
function EmptyState({
  glyph = "◍",
  label,
  hint,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      role="status"
      className={cn(
        "rounded-lg border border-dashed border-hairline-2 bg-surface-1/40 p-8 text-center",
        className
      )}
    >
      <div className="text-3xl opacity-40" aria-hidden>
        {glyph}
      </div>
      <div className="mt-2 text-sm text-ink-2">{label}</div>
      {hint && (
        <div className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-ink-3">
          {hint}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface SkeletonBlockProps {
  className?: string
  lines?: number
}

/**
 * Standardized skeleton placeholder. Use during data load.
 */
function SkeletonBlock({ className, lines = 3 }: SkeletonBlockProps) {
  return (
    <div
      data-slot="skeleton"
      aria-busy="true"
      className={cn("animate-pulse", className)}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-[3px] bg-surface-2 mb-2 last:mb-0"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  )
}

interface ErrorCardProps {
  label?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/**
 * Standardized error card per Design Guidelines §20.
 * Pattern: danger-tinted border + bg, mono UC code label, descriptive body, secondary retry button.
 */
function ErrorCard({
  label = "SYNC FAILED",
  message,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorCardProps) {
  return (
    <div
      data-slot="error-card"
      role="alert"
      className={cn(
        "rounded-lg border border-danger/30 bg-danger/5 p-4",
        className
      )}
    >
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-danger">
        {label}
      </div>
      <div className="mt-1.5 text-[13px] text-ink">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-8 items-center rounded-sm border border-hairline-2 bg-surface-2 px-3 text-[12px] text-ink hover:bg-surface-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-1"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}

export { EmptyState, SkeletonBlock, ErrorCard }
