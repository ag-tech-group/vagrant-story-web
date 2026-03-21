import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Lock, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { MaterialBadge } from "@/components/stat-display"
import {
  gameApi,
  type ChestItem,
  type Blade,
  type Armor,
  type Grip,
  type Gem,
  type Consumable,
  type Grimoire,
  type Area,
} from "@/lib/game-api"

export const Route = createFileRoute("/chests/$id")({
  component: ChestDetail,
})

/** Map item_type to the icon type string used by ItemIcon */
const ICON_MAP: Record<string, string> = {
  blade: "Sword",
  grip: "Grip",
  shield: "Shield",
  armor: "Body",
  gem: "Gem",
  grimoire: "Grimoire",
  sigil: "Sigil",
  key: "Key",
  consumable: "Consumable",
  accessory: "Accessory",
}

/** Map item_type to the route prefix for linking */
const ROUTE_MAP: Record<string, string> = {
  blade: "/blades",
  grip: "/grips",
  shield: "/armor",
  armor: "/armor",
  gem: "/gems",
  grimoire: "/grimoires",
  sigil: "/sigils",
  key: "/keys",
  consumable: "/consumables",
  accessory: "/armor",
}

type NamedItem = { id: number; name: string }

function buildLookup(items: NamedItem[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item.name, item.id)
  }
  return map
}

function ChestDetail() {
  const { id } = Route.useParams()

  const { data: chest } = useQuery({
    queryKey: ["chest", id],
    queryFn: () => gameApi.chest(Number(id)),
  })

  // Fetch all game data for name-based linking
  const { data: blades = [] } = useQuery<Blade[]>({
    queryKey: ["blades"],
    queryFn: gameApi.blades,
  })
  const { data: armor = [] } = useQuery<Armor[]>({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })
  const { data: grips = [] } = useQuery<Grip[]>({
    queryKey: ["grips"],
    queryFn: gameApi.grips,
  })
  const { data: gems = [] } = useQuery<Gem[]>({
    queryKey: ["gems"],
    queryFn: gameApi.gems,
  })
  const { data: consumables = [] } = useQuery<Consumable[]>({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })
  const { data: grimoires = [] } = useQuery<Grimoire[]>({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })
  const { data: sigils = [] } = useQuery({
    queryKey: ["sigils"],
    queryFn: gameApi.sigils,
  })
  const { data: keys = [] } = useQuery({
    queryKey: ["keys"],
    queryFn: gameApi.keys,
  })
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: gameApi.areas,
  })

  if (!chest) return null

  // Find area for cross-linking (normalize "Town Centre" -> "Town Center")
  const normalizedArea = chest.area.replace("Town Centre", "Town Center")
  const linkedArea = areas.find((a) => a.name === normalizedArea)

  // Build lookup maps by name
  const lookups: Record<string, Map<string, number>> = {
    blade: buildLookup(blades),
    grip: buildLookup(grips),
    shield: buildLookup(armor.filter((a) => a.armor_type === "Shield")),
    armor: buildLookup(armor),
    gem: buildLookup(gems),
    consumable: buildLookup(consumables),
    grimoire: buildLookup(grimoires),
    sigil: buildLookup(sigils),
    key: buildLookup(keys),
    accessory: buildLookup(armor.filter((a) => a.armor_type === "Accessory")),
  }

  function getItemLink(item: ChestItem): string | null {
    const routePrefix = ROUTE_MAP[item.item_type]
    if (!routePrefix) return null
    const lookup = lookups[item.item_type]
    if (!lookup) return null
    let itemId = lookup.get(item.item_name)
    // Gem chest items often have a " Gem" suffix (e.g. "Braveheart Gem")
    // that the gems table doesn't include in the name
    if (
      itemId == null &&
      item.item_type === "gem" &&
      item.item_name.endsWith(" Gem")
    ) {
      itemId = lookup.get(item.item_name.slice(0, -4))
    }
    if (itemId == null) return null
    return `${routePrefix}/${itemId}`
  }

  return (
    <Card className="border-primary/30 mx-auto max-w-6xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/chests"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-3 sm:w-48">
            <ItemIcon type="Chest" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {chest.room}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {linkedArea ? (
                  <Link
                    to="/areas/$id"
                    params={{ id: String(linkedArea.id) }}
                    className="text-primary hover:underline"
                  >
                    {chest.area}
                  </Link>
                ) : (
                  chest.area
                )}
              </p>
              {chest.lock_type && (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm">
                  <Lock className="text-muted-foreground size-4" />
                  <Badge variant="outline">{chest.lock_type}</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Contents ({chest.items.length} items)
              </p>
              <div className="divide-border divide-y">
                {chest.items.map((item) => {
                  const link = getItemLink(item)
                  const content = (
                    <div className="flex items-center gap-3 p-3">
                      <ItemIcon
                        type={ICON_MAP[item.item_type] ?? "Gem"}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">
                          {item.item_name}
                        </span>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {item.material && (
                            <MaterialBadge mat={item.material} />
                          )}
                          {item.gem_slots != null && item.gem_slots > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {item.gem_slots} gem{" "}
                              {item.gem_slots === 1 ? "slot" : "slots"}
                            </Badge>
                          )}
                          {item.quantity > 1 && (
                            <Badge variant="secondary" className="text-[10px]">
                              x{item.quantity}
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-[10px] capitalize">
                            {item.item_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  )

                  if (link) {
                    return (
                      <Link
                        key={item.id}
                        to={link}
                        className="hover:bg-muted/50 -mx-2 block rounded px-2 transition-colors"
                      >
                        {content}
                      </Link>
                    )
                  }

                  return <div key={item.id}>{content}</div>
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
