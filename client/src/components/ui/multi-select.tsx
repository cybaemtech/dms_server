import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

export interface MultiSelectProps {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    let newSelected: string[] = []
    
    if (value === "All") {
      if (selected.includes("All")) {
        newSelected = []
      } else {
        newSelected = options.map(o => o.value)
      }
    } else {
      newSelected = selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value]
      
      // Remove "All" if we unselect any other option
      if (selected.includes("All") && !newSelected.includes(value)) {
        newSelected = newSelected.filter(s => s !== "All")
      }
      
      // Add "All" if all other options are selected
      const otherOptions = options.filter(o => o.value !== "All").map(o => o.value)
      const isAllOthersSelected = otherOptions.every(o => newSelected.includes(o))
      if (isAllOthersSelected && !newSelected.includes("All") && options.some(o => o.value === "All")) {
        newSelected = ["All", ...newSelected]
      }
    }
    
    onChange(newSelected)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-auto min-h-8 py-1.5 px-3 text-xs font-normal border-input bg-background hover:bg-background hover:text-foreground",
            className
          )}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.includes("All") ? (
                <Badge variant="secondary" className="text-[10px] h-4 rounded-sm font-medium">All Locations</Badge>
              ) : (
                selected.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="text-[10px] h-4 px-1 rounded-sm font-medium"
                  >
                    {options.find((o) => o.value === s)?.label || s}
                  </Badge>
                ))
              )
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1 shadow-lg border-slate-200" align="start">
        <div className="space-y-0.5 max-h-[220px] overflow-y-auto overflow-x-hidden">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "group flex items-center gap-2.5 p-2 rounded-sm cursor-pointer hover:bg-slate-100 transition-all",
                selected.includes(option.value) && "bg-slate-50"
              )}
              onClick={() => handleSelect(option.value)}
            >
              <Checkbox 
                id={`check-${option.value}`}
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleSelect(option.value)}
                className="h-3.5 w-3.5"
              />
              <label 
                htmlFor={`check-${option.value}`}
                className="text-[11px] font-medium text-slate-700 cursor-pointer flex-1 py-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {option.label}
              </label>
              {selected.includes(option.value) && (
                <Check className="h-3 w-3 text-primary ml-auto" />
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
