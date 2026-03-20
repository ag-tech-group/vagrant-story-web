import { useQuery } from "@tanstack/react-query"
import { ItemIcon } from "@/components/item-icon"
import { MaterialBadge } from "@/components/stat-display"
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
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl tracking-wide sm:text-4xl">Materials</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Material properties affect weapon and armor stats
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function MaterialCard({ material: m }: { material: Material }) {
  const categories = MATERIAL_CATEGORIES[m.name]

  return (
    <div className="border-border/50 bg-card space-y-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <ItemIcon type={m.name} size="sm" />
        <MaterialBadge mat={m.name} />
      </div>

      {categories && (
        <p className="text-muted-foreground text-[11px]">
          {categories.join(", ")}
        </p>
      )}

      <div className="flex gap-3">
        <Stat label="STR" value={m.str_modifier} />
        <Stat label="INT" value={m.int_modifier} />
        <Stat label="AGI" value={m.agi_modifier} />
      </div>

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
