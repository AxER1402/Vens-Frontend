import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

function Popover({ ...props }) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverPortal({ ...props }) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />
}

function PopoverContent({ className, align = "start", sideOffset = 4, ...props }) {
  return (
    <PopoverPortal>
      <PopoverPrimitive.Popup
        data-slot="popover-content"
        className={cn(
          "z-50 w-auto rounded-xl border border-brand-border-light bg-white p-3 text-popover-foreground shadow-2xl outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </PopoverPortal>
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverPortal }
