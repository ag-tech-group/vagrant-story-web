import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MaterialBadge } from "@/components/stat-display"
import { gameApi } from "@/lib/game-api"
import { cn } from "@/lib/utils"

const CHANCE_COLORS: Record<string, string> = {
  always: "text-green-400",
  excellent: "text-green-400",
  "very good": "text-primary",
  good: "text-primary",
  fair: "text-foreground",
  moderate: "text-foreground",
  poor: "text-muted-foreground",
  "very poor": "text-muted-foreground",
  remote: "text-muted-foreground/50",
  abysmal: "text-muted-foreground/50",
}

interface EnemyGroup {
  enemy_name: string
  enemy_id: number
  enemy_class: string
  locations: {
    area_name: string
    area_id: number
    room_name: string
    body_part: string
    material: string
    drop_chance: string
    drop_value: number
    grip: string
    quantity: number
    condition: string
  }[]
}

export function ItemDropLocations({ itemName }: { itemName: string }) {
  const [open, setOpen] = useState(false)

  const { data: drops = [], isLoading } = useQuery({
    queryKey: ["item-drops", itemName],
    queryFn: () => gameApi.itemDrops(itemName),
    enabled: !!itemName,
  })

  const grouped = useMemo(() => {
    const map = new Map<number, EnemyGroup>()
    for (const drop of drops) {
      if (!map.has(drop.enemy_id)) {
        map.set(drop.enemy_id, {
          enemy_name: drop.enemy_name,
          enemy_id: drop.enemy_id,
          enemy_class: drop.enemy_class,
          locations: [],
        })
      }
      map.get(drop.enemy_id)!.locations.push({
        area_name: drop.area_name,
        area_id: drop.area_id,
        room_name: drop.room_name,
        body_part: drop.body_part,
        material: drop.material,
        drop_chance: drop.drop_chance,
        drop_value: drop.drop_value,
        grip: drop.grip,
        quantity: drop.quantity,
        condition: drop.condition,
      })
    }
    return [...map.values()]
  }, [drops])

  if (isLoading) return null
  if (drops.length === 0) return null

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-2 flex w-full items-center gap-2"
      >
        <ChevronRight
          className={cn(
            "text-muted-foreground size-3.5 transition-transform",
            open && "rotate-90"
          )}
        />
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Where to Find
        </p>
        {!open && (
          <span className="text-muted-foreground/60 text-[10px]">
            {grouped.length} {grouped.length === 1 ? "enemy" : "enemies"}
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-2">
          {grouped.map((group) => (
            <div
              key={group.enemy_id}
              className="bg-muted/30 rounded px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <a
                  href={`/bestiary/${group.enemy_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:text-primary/80 font-medium underline decoration-dotted underline-offset-2"
                >
                  {group.enemy_name}
                </a>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {group.enemy_class}
                </Badge>
              </div>
              <div className="mt-1.5 space-y-1">
                {group.locations.map((loc, i) => (
                  <div
                    key={`${loc.area_id}-${loc.room_name}-${loc.body_part}-${i}`}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
                  >
                    <a
                      href={`/areas/${loc.area_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:text-primary/80 underline decoration-dotted underline-offset-2"
                    >
                      {loc.area_name}
                    </a>
                    <span className="text-muted-foreground">/</span>
                    <span>{loc.room_name}</span>
                    <span className="text-muted-foreground">
                      ({loc.body_part})
                    </span>
                    {loc.material && <MaterialBadge mat={loc.material} />}
                    {loc.grip && (
                      <span className="text-muted-foreground">
                        + {loc.grip}
                      </span>
                    )}
                    {loc.quantity > 1 && (
                      <span className="text-muted-foreground">
                        x{loc.quantity}
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "ml-auto shrink-0 cursor-help",
                            CHANCE_COLORS[loc.drop_chance] ??
                              "text-muted-foreground"
                          )}
                        >
                          {loc.drop_chance}
                          {loc.drop_value > 0 &&
                            loc.drop_chance !== "always" &&
                            ` (${Math.round((loc.drop_value / 255) * 100)}%)`}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Raw drop value: {loc.drop_value}/255</p>
                      </TooltipContent>
                    </Tooltip>
                    {loc.condition && (
                      <p className="text-muted-foreground w-full text-[10px]">
                        {loc.condition}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
