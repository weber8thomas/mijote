import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-4xl border-0 bg-card px-3 py-1 text-base ring-1 ring-border/70 transition-shadow outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
