import { ItemIcon } from "@/components/item-icon"
import { MaterialBadge } from "@/components/stat-display"
import { EQUIP_SLOTS, SLOT_LABELS } from "@/lib/inventory-constants"
import type { EquipSlot } from "@/lib/inventory-api"
import { cn } from "@/lib/utils"

// ── Preview item type ───────────────────────────────────────────────
// Minimal interface for rendering item previews. Works with both
// InventoryItem (from the API) and GameSaveImportItem (from the mapper).

export interface PreviewItem {
  item_type: string
  equip_slot?: EquipSlot | string | null
  material?: string | null
  storage?: string
  quantity?: number
}

// ── Read-only components ─────────────────────────────────────────────

export function ReadOnlyEquipmentGrid({
  items,
  getDisplayName,
  getDisplayType,
}: {
  items: PreviewItem[]
  getDisplayName: (item: PreviewItem) => string
  getDisplayType: (item: PreviewItem) => string
}) {
  const getSlotItem = (slot: EquipSlot) =>
    items.find((i) => i.equip_slot === slot)

  return (
    <div
      className="grid gap-1.5"
      style={{
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateAreas: `
          ".        head      accessory"
          "rhand    body      lhand"
          "arms     legs      ."
        `,
      }}
    >
      {EQUIP_SLOTS.map((slot) => {
        const item = getSlotItem(slot.key)
        return (
          <div key={slot.key} style={{ gridArea: slot.gridArea }}>
            {item ? (
              <ReadOnlySlotCard
                item={item}
                displayName={getDisplayName(item)}
                displayType={getDisplayType(item)}
              />
            ) : (
              <div className="border-border/30 flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed p-2">
                <span className="text-muted-foreground/50 text-[9px] font-medium tracking-wider uppercase">
                  {slot.label}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ReadOnlySlotCard({
  item,
  displayName,
  displayType,
}: {
  item: PreviewItem
  displayName: string
  displayType: string
}) {
  return (
    <div className="border-border bg-card/50 flex h-full w-full flex-col items-center gap-0.5 rounded-lg border p-1.5">
      <ItemIcon type={displayType} size="sm" />
      <span className="max-w-full truncate text-[10px] leading-tight font-medium">
        {displayName}
      </span>
      {item.material && <MaterialBadge mat={item.material} />}
    </div>
  )
}

export function ReadOnlyBagItemRow({
  item,
  name,
  type,
}: {
  item: PreviewItem
  name: string
  type: string
}) {
  return (
    <div className="border-border/50 flex items-center gap-2 rounded-lg border px-2 py-1.5">
      <ItemIcon type={type} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-medium">{name}</p>
          {item.equip_slot && (
            <span className="bg-primary/15 text-primary shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold">
              {SLOT_LABELS[item.equip_slot as EquipSlot] ?? "Equipped"}
            </span>
          )}
          {item.storage === "container" && (
            <span className="bg-muted text-muted-foreground shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold">
              Container
            </span>
          )}
        </div>
        {item.material && <MaterialBadge mat={item.material} />}
      </div>
      {((item.quantity ?? 1) > 1 || item.item_type === "consumable") && (
        <span className="text-muted-foreground text-[10px]">
          x{item.quantity ?? 1}
        </span>
      )}
    </div>
  )
}

export function StatBox({
  label,
  value,
  diff,
}: {
  label: string
  value: number
  /** Optional equipment modifier shown as (+N) or (-N) */
  diff?: number
}) {
  return (
    <div className="bg-muted/50 flex min-w-11 flex-col items-center rounded px-2 py-1.5">
      <span className="text-muted-foreground text-xs leading-none">
        {label}
      </span>
      <span
        className={cn(
          "text-sm leading-tight font-medium",
          value > 0 && "text-green-400",
          value < 0 && "text-red-400",
          value === 0 && "text-muted-foreground"
        )}
      >
        {value}
      </span>
      {diff != null && diff !== 0 && (
        <span
          className={cn(
            "text-[10px] leading-none font-medium",
            diff > 0 ? "text-green-400/70" : "text-red-400/70"
          )}
        >
          ({diff > 0 ? `+${diff}` : diff})
        </span>
      )}
    </div>
  )
}
