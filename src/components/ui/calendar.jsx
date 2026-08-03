import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("p-2 bg-white rounded-lg", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        caption: "flex justify-center pt-1 relative items-center font-semibold text-brand-deep text-sm",
        caption_label: "text-sm font-semibold text-brand-deep capitalize",
        nav: "flex items-center gap-1",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 flex items-center justify-center border border-brand-border-light rounded-md hover:bg-brand-surface-alt",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex text-xs text-brand-text-muted font-medium mb-1",
        head_cell: "text-brand-text-muted rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-1 gap-1",
        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-brand-surface-alt rounded-md transition-colors flex items-center justify-center text-xs text-brand-text",
        day_selected: "bg-[#243757] text-white hover:bg-[#243757] hover:text-white font-bold shadow-xs",
        day_today: "bg-brand-surface-alt text-brand-slate font-bold border border-brand-border-light",
        day_outside: "opacity-40",
        day_disabled: "opacity-20 pointer-events-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}

export { Calendar }
