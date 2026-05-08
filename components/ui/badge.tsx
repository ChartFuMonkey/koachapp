import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-[0.06em] whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-transparent [a]:hover:bg-primary/85",
        secondary:
          "bg-surface-2 text-ink-2 border-hairline-2 [a]:hover:bg-surface-3",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/30 focus-visible:ring-destructive/20 [a]:hover:bg-destructive/15",
        outline:
          "bg-transparent text-ink-3 border-border [a]:hover:bg-surface-2",
        success:
          "bg-good/10 text-good border-good/30",
        warning:
          "bg-warn/10 text-warn border-warn/30",
        info:
          "bg-info/10 text-info border-info/30",
        ghost:
          "bg-transparent text-ink-3 border-transparent [a]:hover:bg-surface-2",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
