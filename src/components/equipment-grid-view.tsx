import { ItemIcon } from "@/components/item-icon"
import { StatBox } from "@/components/inventory-preview"
import { DamageTypeBadge, MaterialBadge } from "@/components/stat-display"
import { EQUIP_SLOTS } from "@/lib/inventory-constants"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────

export interface GridSlotData {
  name: string
  type: string
  material: string
  damageType?: string
  hands?: string
  gripName?: string
}

export interface EquipmentGridViewProps {
  slots: Partial<Record<string, GridSlotData>>
  combinedStats?: { str: number; int: number; agi: number }
}

// ── Component ────────────────────────────────────────────────────────

export function EquipmentGridView({
  slots,
  combinedStats,
}: EquipmentGridViewProps) {
  const is2H = slots.right_hand?.hands === "2H"

  return (
    <div className="space-y-3">
      <div
        className="grid gap-2"
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
          const item = slots[slot.key]
          const disabled = slot.key === "left_hand" && is2H

          if (item) {
            return (
              <div
                key={slot.key}
                style={{ gridArea: slot.gridArea }}
                className="border-border bg-card/50 flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-lg border p-2"
              >
                <ItemIcon type={item.type} size="sm" />
                <span className="max-w-full truncate text-center text-sm leading-tight font-medium">
                  {item.name}
                </span>
                {item.material && <MaterialBadge mat={item.material} />}
                {(item.damageType || item.hands) && (
                  <div className="flex items-center gap-1 text-[10px]">
                    {item.damageType && (
                      <DamageTypeBadge type={item.damageType} />
                    )}
                    {item.hands && (
                      <span className="text-muted-foreground">
                        {item.hands}
                      </span>
                    )}
                  </div>
                )}
                {item.gripName && (
                  <span className="text-muted-foreground text-[10px]">
                    Grip: {item.gripName}
                  </span>
                )}
              </div>
            )
          }

          return (
            <div
              key={slot.key}
              style={{ gridArea: slot.gridArea }}
              className={cn(
                "flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-3",
                disabled ? "border-border/30 opacity-40" : "border-border/50"
              )}
            >
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {slot.label}
              </span>
              {disabled && (
                <span className="text-muted-foreground text-[9px]">
                  2H equipped
                </span>
              )}
            </div>
          )
        })}
      </div>

      {combinedStats && (
        <div className="flex flex-wrap justify-center gap-1.5">
          <StatBox label="STR" value={combinedStats.str} />
          <StatBox label="INT" value={combinedStats.int} />
          <StatBox label="AGI" value={combinedStats.agi} />
        </div>
      )}
    </div>
  )
}
