import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ItemIcon } from "@/components/item-icon"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn, useIsMobile } from "@/lib/utils"

export interface PickerItem {
  name: string
  type: string
  level?: number
  suffix?: string
}

interface ItemPickerProps {
  items: PickerItem[]
  value: string | null
  onSelect: (name: string | null) => void
  placeholder?: string
  label?: string
  formatType?: (type: string) => string
}

function TriggerButton({
  value,
  selectedItem,
  placeholder,
  formatType,
  onClear,
  onClick,
}: {
  value: string | null
  selectedItem: PickerItem | null | undefined
  placeholder: string
  formatType?: (type: string) => string
  onClear: () => void
  onClick?: () => void
}) {
  return (
    <Button
      variant="outline"
      role="combobox"
      className="h-auto min-h-12 w-full justify-between px-3 py-2"
      onClick={onClick}
    >
      {value ? (
        <div className="flex flex-1 items-center gap-2">
          <ItemIcon type={selectedItem?.type} size="sm" />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {value}
          </span>
          {selectedItem?.suffix && (
            <span className="bg-muted shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold">
              {selectedItem.suffix}
            </span>
          )}
          {selectedItem?.type && (
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatType ? formatType(selectedItem.type) : selectedItem.type}
            </span>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">{placeholder}</span>
      )}
      <div className="flex items-center gap-1">
        {value && (
          <span
            role="button"
            tabIndex={0}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClear()
            }}
          >
            <X className="size-4" />
          </span>
        )}
        <ChevronsUpDown className="text-muted-foreground size-4" />
      </div>
    </Button>
  )
}

function ItemCommandList({
  groups,
  value,
  onSelect,
  maxHeight,
}: {
  groups: Record<string, PickerItem[]>
  value: string | null
  onSelect: (name: string) => void
  maxHeight?: string
}) {
  return (
    <Command>
      <CommandInput placeholder="Search items..." />
      <CommandList className={maxHeight}>
        <CommandEmpty>No items found.</CommandEmpty>
        {Object.entries(groups).map(([type, groupItems]) => (
          <CommandGroup key={type} heading={type}>
            {groupItems.map((item) => (
              <CommandItem
                key={item.name}
                value={item.name}
                onSelect={() => onSelect(item.name)}
              >
                <ItemIcon type={item.type} size="sm" />
                <span className="flex-1">{item.name}</span>
                {item.suffix && (
                  <span className="bg-muted shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold">
                    {item.suffix}
                  </span>
                )}
                <Check
                  className={cn(
                    "ml-auto size-4",
                    value === item.name ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  )
}

export function ItemPicker({
  items,
  value,
  onSelect,
  placeholder = "Select item...",
  label,
  formatType,
}: ItemPickerProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const selectedItem = value ? items.find((i) => i.name === value) : null

  // Group items by type, sorted by level within each group
  const groups = items.reduce<Record<string, PickerItem[]>>((acc, item) => {
    const group = item.type || "Other"
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})
  for (const items of Object.values(groups)) {
    items.sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
  }

  const handleSelect = (name: string) => {
    onSelect(name === value ? null : name)
    setOpen(false)
  }

  const handleClear = () => {
    onSelect(null)
    setOpen(false)
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <span className="text-muted-foreground text-xs font-medium">
            {label}
          </span>
        )}
        <TriggerButton
          value={value}
          selectedItem={selectedItem}
          placeholder={placeholder}
          formatType={formatType}
          onClear={handleClear}
          onClick={() => setOpen(true)}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-md"
            showCloseButton={false}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{placeholder}</DialogTitle>
            </DialogHeader>
            <ItemCommandList
              groups={groups}
              value={value}
              onSelect={handleSelect}
              maxHeight="max-h-[70vh]"
            />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <TriggerButton
            value={value}
            selectedItem={selectedItem}
            placeholder={placeholder}
            formatType={formatType}
            onClear={handleClear}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ItemCommandList
            groups={groups}
            value={value}
            onSelect={handleSelect}
            maxHeight="max-h-[min(300px,60vh)]"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
