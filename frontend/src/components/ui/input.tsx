import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex h-10 w-full rounded-lg bg-white px-3 py-2 text-sm text-zinc-900 transition-colors",
        // Border styles - Protocol uses subtle borders
        "ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10",
        // Dark mode
        "dark:bg-white/5 dark:text-white",
        // Placeholder
        "placeholder:text-zinc-500 dark:placeholder:text-zinc-500",
        // Focus styles - emerald ring
        "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-900 dark:file:text-zinc-100",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:ring-red-500/50 aria-invalid:ring-2",
        className
      )}
      {...props}
    />
  )
}

export { Input }
