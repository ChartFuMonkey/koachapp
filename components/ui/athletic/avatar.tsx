import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "inline-flex items-center justify-center font-bold text-bg select-none shrink-0",
  {
    variants: {
      size: {
        xs: "size-7 text-[11px] rounded-md",
        sm: "size-8 text-[12px] rounded-md",
        md: "size-10 text-[13px] rounded-lg",
        lg: "size-14 text-[18px] rounded-xl",
        xl: "size-[72px] text-[24px] rounded-2xl",
      },
      shape: {
        square: "",
        circle: "rounded-full",
      },
    },
    defaultVariants: {
      size: "md",
      shape: "square",
    },
  }
)

interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  name: string
  src?: string | null
}

function getInitials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Avatar({
  name,
  src,
  size,
  shape,
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        avatarVariants({ size, shape }),
        "overflow-hidden",
        className
      )}
      style={{
        background: src
          ? undefined
          : "linear-gradient(135deg, #C5F73B, #3DE8A0)",
      }}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  )
}

export { Avatar, avatarVariants, getInitials }
