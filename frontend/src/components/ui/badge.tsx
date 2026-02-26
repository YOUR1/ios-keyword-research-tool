import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors",
  {
    variants: {
      variant: {
        // Protocol default - zinc pill
        default:
          "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
        // Protocol emerald/success
        success:
          "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-500/30",
        // Protocol warning - amber
        warning:
          "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400 dark:ring-amber-500/30",
        // Protocol destructive - red
        destructive:
          "bg-red-500/10 text-red-600 ring-1 ring-inset ring-red-500/20 dark:text-red-400 dark:ring-red-500/30",
        // Protocol secondary - subtle
        secondary:
          "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        // Protocol outline
        outline:
          "text-zinc-600 ring-1 ring-inset ring-zinc-900/10 dark:text-zinc-400 dark:ring-white/10",
        // Protocol sky/info
        info:
          "bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400 dark:ring-sky-500/30",
        // Protocol violet
        violet:
          "bg-violet-500/10 text-violet-600 ring-1 ring-inset ring-violet-500/20 dark:text-violet-400 dark:ring-violet-500/30",
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
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
