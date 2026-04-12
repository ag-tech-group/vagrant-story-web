import { useQuery } from "@tanstack/react-query"
import { ItemIcon } from "@/components/item-icon"
import { MaterialBadge } from "@/components/stat-display"
import { Skeleton } from "@/components/ui/skeleton"
import { gameApi, type Material } from "@/lib/game-api"
import { cn } from "@/lib/utils"

const MATERIAL_CATEGORIES: Record<string, string[]> = {
  Wood: ["Shields"],
  Leather: ["Armor"],
  Bronze: ["Blades", "Armor", "Shields"],
  Iron: ["Blades", "Armor", "Shields"],
  Hagane: ["Blades", "Armor", "Shields"],
  Silver: ["Blades", "Armor", "Shields"],
  Damascus: ["Blades", "Armor", "Shields"],
}

const CREATURE_TYPES = [
  "human",
  "beast",
  "undead",
  "phantom",
  "dragon",
  "evil",
] as const
const ELEMENT_TYPES = [
  "fire",
  "water",
  "wind",
  "earth",
  "light",
  "dark",
] as const

export function MaterialsPage() {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })

  return (
    <>
      <div>
        <h1 className="text-3xl tracking-wide sm:text-4xl">Materials</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Material properties affect blade and armor stats
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}
    </>
  )
}

function hasNonZero(a: number, b: number, c: number) {
  return a !== 0 || b !== 0 || c !== 0
}

function MaterialCard({ material: m }: { material: Material }) {
  const categories = MATERIAL_CATEGORIES[m.name]
  const showBlade =
    categories?.includes("Blades") &&
    hasNonZero(m.blade_str, m.blade_int, m.blade_agi)
  const showShield =
    categories?.includes("Shields") &&
    hasNonZero(m.shield_str, m.shield_int, m.shield_agi)
  const showArmor = categories?.includes("Armor") ?? false
  const hasOffsets = showBlade || showShield || showArmor

  return (
    <div className="border-border/50 bg-card space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <ItemIcon type={m.name} size="sm" />
        <MaterialBadge mat={m.name} />
      </div>

      {hasOffsets || categories?.includes("Armor") ? (
        <div className="space-y-1.5">
          {showBlade && (
            <OffsetRow
              label="Blade"
              str={m.blade_str}
              int={m.blade_int}
              agi={m.blade_agi}
            />
          )}
          {showShield && (
            <OffsetRow
              label="Shield"
              str={m.shield_str}
              int={m.shield_int}
              agi={m.shield_agi}
            />
          )}
          {showArmor && (
            <OffsetRow
              label="Armor"
              str={m.armor_str}
              int={m.armor_int}
              agi={m.armor_agi}
            />
          )}
        </div>
      ) : (
        <div className="flex gap-3">
          <Stat label="STR" value={m.str_modifier} />
          <Stat label="INT" value={m.int_modifier} />
          <Stat label="AGI" value={m.agi_modifier} />
        </div>
      )}

      <div className="grid grid-cols-6 gap-1">
        {CREATURE_TYPES.map((type) => (
          <Stat key={type} label={type} value={m[type] as number} small />
        ))}
      </div>

      <div className="grid grid-cols-6 gap-1">
        {ELEMENT_TYPES.map((type) => (
          <Stat key={type} label={type} value={m[type] as number} small />
        ))}
      </div>
    </div>
  )
}

function OffsetRow({
  label,
  str,
  int: intVal,
  agi,
}: {
  label: string
  str: number
  int: number
  agi: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-12 shrink-0 text-[11px]">
        {label}
      </span>
      <div className="flex flex-1 gap-2">
        <Stat label="STR" value={str} />
        <Stat label="INT" value={intVal} />
        <Stat label="AGI" value={agi} />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  small,
}: {
  label: string
  value: number
  small?: boolean
}) {
  return (
    <div
      className={cn(
        "bg-muted/50 flex flex-col items-center rounded",
        small ? "px-1 py-0.5" : "min-w-10 px-1.5 py-1"
      )}
    >
      <span
        className={cn(
          "text-muted-foreground leading-none capitalize",
          small ? "text-[9px]" : "text-[11px]"
        )}
      >
        {label.slice(0, 3)}
      </span>
      <span
        className={cn(
          "leading-tight font-medium",
          small ? "text-xs" : "text-sm",
          value > 0 && "text-green-400",
          value < 0 && "text-red-400",
          value === 0 && "text-muted-foreground"
        )}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  )
}
