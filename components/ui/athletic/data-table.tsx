import * as React from "react"

import { cn } from "@/lib/utils"

interface DataTableRootProps extends React.HTMLAttributes<HTMLDivElement> {}

function DataTable({ className, ...props }: DataTableRootProps) {
  return (
    <div
      data-slot="data-table"
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
      {...props}
    />
  )
}

interface DataTableHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  cols: string
}

function DataTableHeader({
  className,
  cols,
  style,
  ...props
}: DataTableHeaderProps) {
  return (
    <div
      data-slot="data-table-header"
      className={cn(
        "grid items-center border-b border-border px-5 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3",
        className
      )}
      style={{ ...style, gridTemplateColumns: cols }}
      {...props}
    />
  )
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLDivElement> {
  cols: string
  isLast?: boolean
}

function DataTableRow({
  className,
  cols,
  isLast,
  style,
  ...props
}: DataTableRowProps) {
  return (
    <div
      data-slot="data-table-row"
      className={cn(
        "grid items-center px-5 py-3.5 text-sm",
        !isLast && "border-b border-border",
        "hover:bg-surface-2/40 transition-colors",
        className
      )}
      style={{ ...style, gridTemplateColumns: cols }}
      {...props}
    />
  )
}

export { DataTable, DataTableHeader, DataTableRow }
