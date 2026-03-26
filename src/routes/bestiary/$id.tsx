import { useMemo, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MaterialBadge } from "@/components/stat-display"
import {
  gameApi,
  type EnemyBodyPart,
  type EnemyDrop,
  type EncounterDrop,
  type EnemyEncounter,
} from "@/lib/game-api"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/bestiary/$id")({
  component: EnemyDetail,
})

/** Affinity/damage keys we analyze for weaknesses and resistances */
const ELEMENT_KEYS = [
  { key: "air", label: "Air" },
  { key: "fire", label: "Fire" },
  { key: "earth", label: "Earth" },
  { key: "water", label: "Water" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
] as const

const DAMAGE_KEYS = [
  { key: "blunt", label: "Blunt" },
  { key: "edged", label: "Edged" },
  { key: "piercing", label: "Piercing" },
] as const

type AffinityKey = (typeof ELEMENT_KEYS)[number]["key"]
type DamageKey = (typeof DAMAGE_KEYS)[number]["key"]

function averageAffinity(
  parts: EnemyBodyPart[],
  key: AffinityKey | DamageKey | "physical"
): number {
  if (parts.length === 0) return 0
  return Math.round(parts.reduce((sum, p) => sum + p[key], 0) / parts.length)
}

function EnemyDetail() {
  const { id } = Route.useParams()
  const [dropFilter, setDropFilter] = useState<{
    item: string
    material: string
  } | null>(null)
  const [dropsOpen, setDropsOpen] = useState(false)
  const [locationsOpen, setLocationsOpen] = useState(false)

  const { data: enemy } = useQuery({
    queryKey: ["enemy", id],
    queryFn: () => gameApi.enemy(Number(id)),
  })

  const { weaknesses, resistances } = useMemo(() => {
    if (!enemy?.body_parts?.length) return { weaknesses: [], resistances: [] }

    const parts = enemy.body_parts
    const all = [
      { label: "Physical", avg: averageAffinity(parts, "physical") },
      ...ELEMENT_KEYS.map((e) => ({
        label: e.label,
        avg: averageAffinity(parts, e.key),
      })),
      ...DAMAGE_KEYS.map((d) => ({
        label: d.label,
        avg: averageAffinity(parts, d.key),
      })),
    ]

    return {
      weaknesses: all.filter((a) => a.avg < 0).sort((a, b) => a.avg - b.avg),
      resistances: all.filter((a) => a.avg > 20).sort((a, b) => b.avg - a.avg),
    }
  }, [enemy])

  if (!enemy) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-4xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/bestiary"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Left: icon, name, class */}
          <div className="flex shrink-0 flex-col items-center gap-3 sm:w-48">
            <ItemIcon type="Enemy" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {enemy.name}
              </h2>
              <div className="mt-1 flex items-center justify-center gap-2">
                <Badge variant="secondary">{enemy.enemy_class}</Badge>
                {enemy.is_boss && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 bg-amber-600/20 text-amber-300"
                  >
                    Boss
                  </Badge>
                )}
              </div>
              {enemy.encyclopaedia_number != null && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Encyclopaedia #{enemy.encyclopaedia_number}
                </p>
              )}
            </div>
          </div>

          {/* Right: stats, tips, body parts */}
          <div className="flex flex-1 flex-col gap-4">
            {enemy.description && (
              <p className="text-sm">{enemy.description}</p>
            )}

            {/* Base stats */}
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
                Base Stats
              </p>
              <div className="flex flex-wrap gap-1.5">
                <StatBadge label="HP" value={enemy.hp} />
                <StatBadge label="MP" value={enemy.mp} />
                <StatBadge label="STR" value={enemy.str} />
                <StatBadge label="INT" value={enemy.int} />
                <StatBadge label="AGL" value={enemy.agi} />
                <StatBadge label="MOV" value={enemy.movement} />
              </div>
            </div>

            {/* Weaknesses & Resistances */}
            {(weaknesses.length > 0 || resistances.length > 0) && (
              <div className="flex flex-wrap gap-6">
                {weaknesses.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
                      Weak To
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {weaknesses.map((w) => (
                        <span
                          key={w.label}
                          className="rounded bg-green-500/15 px-2 py-1 text-xs font-medium text-green-400"
                        >
                          {w.label} ({w.avg})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {resistances.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
                      Resistant To
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {resistances.map((r) => (
                        <span
                          key={r.label}
                          className="rounded bg-red-500/15 px-2 py-1 text-xs font-medium text-red-400"
                        >
                          {r.label} (+{r.avg})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Body parts table */}
            {enemy.body_parts && enemy.body_parts.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
                  Body Parts
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead>Phys</TableHead>
                        <TableHead>Air</TableHead>
                        <TableHead>Fire</TableHead>
                        <TableHead>Earth</TableHead>
                        <TableHead>Water</TableHead>
                        <TableHead>Light</TableHead>
                        <TableHead>Dark</TableHead>
                        <TableHead>Blunt</TableHead>
                        <TableHead>Edged</TableHead>
                        <TableHead>Pierce</TableHead>
                        <TableHead>Evade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enemy.body_parts.map((part) => (
                        <BodyPartRow key={part.id} part={part} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Drops */}
            {enemy.drops && enemy.drops.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setDropsOpen(!dropsOpen)}
                  className="mb-1.5 flex w-full items-center gap-2"
                >
                  <ChevronRight
                    className={cn(
                      "text-muted-foreground size-3.5 transition-transform",
                      dropsOpen && "rotate-90"
                    )}
                  />
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Drops Summary
                  </p>
                  {!dropsOpen && (
                    <span className="text-muted-foreground/60 text-[10px]">
                      {enemy.drops.length} items
                    </span>
                  )}
                  {dropsOpen && (
                    <p className="text-muted-foreground/60 text-[10px]">
                      Click an item to filter drop locations
                    </p>
                  )}
                  {dropFilter && (
                    <span
                      className="text-primary hover:text-primary/80 text-[10px] underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDropFilter(null)
                      }}
                    >
                      Clear filter
                    </span>
                  )}
                </button>
                {dropsOpen && (
                  <div className="space-y-1">
                    {/* Header */}
                    <div className="text-muted-foreground flex items-center gap-2 px-3 py-1 text-[11px] font-medium">
                      <span className="w-20 shrink-0">Slot</span>
                      <span className="flex-1">Item</span>
                      <span className="shrink-0">Chance</span>
                    </div>
                    {groupDrops(enemy.drops).map((group) => (
                      <div key={group.label} className="space-y-1">
                        <p className="text-muted-foreground text-[11px] font-medium">
                          {group.label}
                        </p>
                        {group.items.map((drop) => (
                          <DropRow
                            key={drop.id}
                            drop={drop}
                            isActive={
                              dropFilter?.item === drop.item &&
                              dropFilter?.material === drop.material
                            }
                            onSelect={() => {
                              const isClearing =
                                dropFilter?.item === drop.item &&
                                dropFilter?.material === drop.material
                              setDropFilter(
                                isClearing
                                  ? null
                                  : { item: drop.item, material: drop.material }
                              )
                              if (!isClearing) setLocationsOpen(true)
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Locations */}
            {enemy.encounters && enemy.encounters.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setLocationsOpen(!locationsOpen)}
                  className="mb-1.5 flex w-full items-center gap-2"
                >
                  <ChevronRight
                    className={cn(
                      "text-muted-foreground size-3.5 transition-transform",
                      locationsOpen && "rotate-90"
                    )}
                  />
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Locations
                  </p>
                  {!locationsOpen && (
                    <span className="text-muted-foreground/60 text-[10px]">
                      {enemy.encounters.length} encounters
                    </span>
                  )}
                  {locationsOpen && dropFilter && (
                    <span className="text-primary text-[10px] font-medium">
                      showing rooms with "
                      {dropFilter.material ? `${dropFilter.material} ` : ""}
                      {dropFilter.item}"
                    </span>
                  )}
                </button>
                {locationsOpen && (
                  <LocationsSection
                    encounters={enemy.encounters}
                    dropFilter={dropFilter}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function groupDrops(drops: EnemyDrop[]) {
  const equipment = drops.filter(
    (d) => d.body_part !== "Misc" && d.body_part !== "Chest"
  )
  const consumables = drops.filter(
    (d) => d.body_part === "Misc" || d.body_part === "Chest"
  )
  const groups: { label: string; items: EnemyDrop[] }[] = []
  if (equipment.length > 0)
    groups.push({ label: "Equipment", items: equipment })
  if (consumables.length > 0)
    groups.push({ label: "Consumables", items: consumables })
  return groups
}

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

function DropRow({
  drop,
  isActive,
  onSelect,
}: {
  drop: EnemyDrop
  isActive?: boolean
  onSelect?: () => void
}) {
  const chanceColor = CHANCE_COLORS[drop.drop_chance] ?? "text-muted-foreground"
  const displayPart = drop.body_part === "Misc" ? "Consumable" : drop.body_part

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors",
        isActive ? "bg-primary/15 ring-primary/30 ring-1" : "bg-muted/30",
        onSelect && "hover:bg-muted/50 cursor-pointer"
      )}
      onClick={onSelect}
    >
      <span className="text-muted-foreground w-20 shrink-0">{displayPart}</span>
      <span className="font-medium">
        {drop.quantity > 1 && `${drop.quantity}x `}
        {drop.item}
      </span>
      {drop.material && <MaterialBadge mat={drop.material} />}
      {drop.grip && (
        <span className="text-muted-foreground">+ {drop.grip}</span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("ml-auto shrink-0 cursor-help", chanceColor)}>
            {drop.drop_chance}
            {drop.drop_value > 0 &&
              drop.drop_chance !== "always" &&
              ` (${Math.round((drop.drop_value / 255) * 100)}%)`}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Raw drop value: {drop.drop_value}/255</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function BodyPartRow({ part }: { part: EnemyBodyPart }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{part.name}</TableCell>
      <TableCell>
        <AffinityCell value={part.physical} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.air} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.fire} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.earth} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.water} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.light} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.dark} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.blunt} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.edged} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.piercing} />
      </TableCell>
      <TableCell>
        <AffinityCell value={part.evade} />
      </TableCell>
    </TableRow>
  )
}

function AffinityCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "text-sm",
        value > 0 && "font-medium text-green-400",
        value < 0 && "font-medium text-red-400",
        value === 0 && "text-muted-foreground"
      )}
    >
      {value}
    </span>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 flex min-w-11 flex-col items-center rounded px-2 py-1.5">
      <span className="text-muted-foreground text-xs leading-none">
        {label}
      </span>
      <span className="text-foreground text-sm leading-tight font-medium">
        {value}
      </span>
    </div>
  )
}

function EncounterDropRow({ drop }: { drop: EncounterDrop }) {
  const chanceColor = CHANCE_COLORS[drop.drop_chance] ?? "text-muted-foreground"

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-muted-foreground w-16 shrink-0">
        {drop.body_part}
      </span>
      <span className="font-medium">
        {drop.quantity > 1 && `${drop.quantity}x `}
        {drop.item}
      </span>
      {drop.material && <MaterialBadge mat={drop.material} />}
      {drop.grip && (
        <span className="text-muted-foreground">+ {drop.grip}</span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("ml-auto shrink-0 cursor-help", chanceColor)}>
            {drop.drop_chance}
            {drop.drop_value > 0 &&
              drop.drop_chance !== "always" &&
              ` (${Math.round((drop.drop_value / 255) * 100)}%)`}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Raw drop value: {drop.drop_value}/255</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function LocationsSection({
  encounters,
  dropFilter,
}: {
  encounters: EnemyEncounter[]
  dropFilter: { item: string; material: string } | null
}) {
  // Group encounters by area, filtering by drop item+material if active
  const grouped = useMemo(() => {
    const filtered = dropFilter
      ? encounters.filter((enc) =>
          enc.drops?.some(
            (d) =>
              d.item === dropFilter.item && d.material === dropFilter.material
          )
        )
      : encounters

    const map = new Map<
      string,
      {
        area_id: number
        rooms: {
          room_name: string
          condition: string
          attacks: string
          drops: EncounterDrop[]
        }[]
      }
    >()
    for (const enc of filtered) {
      const area = enc.area_name || "Unknown"
      if (!map.has(area)) map.set(area, { area_id: enc.area_id, rooms: [] })
      map.get(area)!.rooms.push({
        room_name: enc.room_name,
        condition: enc.condition,
        attacks: enc.attacks,
        drops: enc.drops ?? [],
      })
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [encounters, dropFilter])

  return (
    <div className="space-y-2">
      {grouped.map(([area, { area_id, rooms }]) => (
        <div key={area}>
          <Link
            to="/areas/$id"
            params={{ id: String(area_id) }}
            className="text-primary hover:text-primary/80 text-xs font-medium underline decoration-dotted underline-offset-2"
          >
            {area}
          </Link>
          <div className="mt-1 space-y-1">
            {rooms.map((room, i) => (
              <div
                key={`${room.room_name}-${i}`}
                className="bg-muted/30 rounded px-3 py-1.5 text-xs"
              >
                <span className="font-medium">{room.room_name}</span>
                {room.condition && (
                  <p className="text-muted-foreground mt-0.5">
                    {room.condition}
                  </p>
                )}
                <div className="border-border/30 mt-1.5 space-y-0.5 border-t pt-1.5">
                  {room.drops.length > 0 ? (
                    room.drops.map((drop) => (
                      <EncounterDropRow key={drop.id} drop={drop} />
                    ))
                  ) : (
                    <p className="text-muted-foreground/50 text-right text-[10px]">
                      No drops
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
