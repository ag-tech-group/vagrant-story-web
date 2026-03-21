import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { MapPin, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import {
  gameApi,
  type Chest,
  type Grimoire,
  type Sigil,
  type Key,
  type Workshop,
  type Room,
} from "@/lib/game-api"

export const Route = createFileRoute("/areas/$id")({
  component: AreaDetail,
})

function AreaDetail() {
  const { id } = Route.useParams()

  const { data: area } = useQuery({
    queryKey: ["area", id],
    queryFn: () => gameApi.area(Number(id)),
  })

  const { data: chests = [] } = useQuery({
    queryKey: ["chests"],
    queryFn: gameApi.chests,
  })
  const { data: grimoires = [] } = useQuery({
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
  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops"],
    queryFn: gameApi.workshops,
  })

  if (!area) return null

  // Build room lookup for items
  const roomIds = new Set(area.rooms.map((r: Room) => r.id))

  // Group chests by room_id
  const chestsByRoom = new Map<number, Chest[]>()
  for (const chest of chests) {
    if (chest.room_id && roomIds.has(chest.room_id)) {
      const arr = chestsByRoom.get(chest.room_id) || []
      arr.push(chest)
      chestsByRoom.set(chest.room_id, arr)
    }
  }

  // Group grimoires by area name match (aggregated endpoint doesn't have room_id)
  const grimoiresByArea = grimoires.filter((g: Grimoire) =>
    g.areas.includes(area.name)
  )

  // Group sigils by room_id
  const sigilsByRoom = new Map<number, Sigil[]>()
  for (const sigil of sigils) {
    if (sigil.room_id && roomIds.has(sigil.room_id)) {
      const arr = sigilsByRoom.get(sigil.room_id) || []
      arr.push(sigil)
      sigilsByRoom.set(sigil.room_id, arr)
    }
  }

  // Group keys by room_id
  const keysByRoom = new Map<number, Key[]>()
  for (const key of keys) {
    if (key.room_id && roomIds.has(key.room_id)) {
      const arr = keysByRoom.get(key.room_id) || []
      arr.push(key)
      keysByRoom.set(key.room_id, arr)
    }
  }

  // Group workshops by room_id
  const workshopsByRoom = new Map<number, Workshop[]>()
  for (const ws of workshops) {
    if (ws.room_id && roomIds.has(ws.room_id)) {
      const arr = workshopsByRoom.get(ws.room_id) || []
      arr.push(ws)
      workshopsByRoom.set(ws.room_id, arr)
    }
  }

  return (
    <Card className="border-primary/30 mx-auto max-w-4xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/areas"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <ItemIcon type="Area" size="lg" className="rounded-lg" />
            <div>
              <h2 className="text-3xl font-medium tracking-wide">
                {area.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {area.rooms.length} {area.rooms.length === 1 ? "room" : "rooms"}
              </p>
            </div>
          </div>

          {/* Grimoires found in this area */}
          {grimoiresByArea.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                Grimoires in this area
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grimoiresByArea.map((g: Grimoire) => (
                  <Link
                    key={g.id}
                    to="/grimoires/$id"
                    params={{ id: String(g.id) }}
                  >
                    <Badge
                      variant="outline"
                      className="hover:border-primary/40 cursor-pointer transition-colors"
                    >
                      <ItemIcon type="Grimoire" size="sm" className="mr-1" />
                      {g.name} ({g.spell_name})
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Rooms */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Rooms
            </p>
            <div className="divide-border divide-y">
              {area.rooms.map((room: Room) => {
                const roomChests = chestsByRoom.get(room.id) || []
                const roomSigils = sigilsByRoom.get(room.id) || []
                const roomKeys = keysByRoom.get(room.id) || []
                const roomWorkshops = workshopsByRoom.get(room.id) || []
                const hasItems =
                  roomChests.length > 0 ||
                  roomSigils.length > 0 ||
                  roomKeys.length > 0 ||
                  roomWorkshops.length > 0

                return (
                  <div key={room.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="text-muted-foreground size-4 shrink-0" />
                      <span className="font-medium">{room.name}</span>
                    </div>
                    {hasItems && (
                      <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                        {roomChests.map((chest) => (
                          <Link
                            key={`chest-${chest.id}`}
                            to="/chests/$id"
                            params={{ id: String(chest.id) }}
                          >
                            <Badge
                              variant="secondary"
                              className="hover:border-primary/40 cursor-pointer text-xs transition-colors"
                            >
                              <ItemIcon
                                type="Chest"
                                size="sm"
                                className="mr-1"
                              />
                              Chest
                              {chest.lock_type ? ` (${chest.lock_type})` : ""}
                            </Badge>
                          </Link>
                        ))}
                        {roomSigils.map((sigil) => (
                          <Link
                            key={`sigil-${sigil.id}`}
                            to="/sigils/$id"
                            params={{ id: String(sigil.id) }}
                          >
                            <Badge
                              variant="secondary"
                              className="hover:border-primary/40 cursor-pointer text-xs transition-colors"
                            >
                              <ItemIcon
                                type="Sigil"
                                size="sm"
                                className="mr-1"
                              />
                              {sigil.name}
                            </Badge>
                          </Link>
                        ))}
                        {roomKeys.map((key) => (
                          <Link
                            key={`key-${key.id}`}
                            to="/keys/$id"
                            params={{ id: String(key.id) }}
                          >
                            <Badge
                              variant="secondary"
                              className="hover:border-primary/40 cursor-pointer text-xs transition-colors"
                            >
                              <ItemIcon type="Key" size="sm" className="mr-1" />
                              {key.name}
                            </Badge>
                          </Link>
                        ))}
                        {roomWorkshops.map((ws) => (
                          <Link
                            key={`ws-${ws.id}`}
                            to="/workshops/$id"
                            params={{ id: String(ws.id) }}
                          >
                            <Badge
                              variant="secondary"
                              className="hover:border-primary/40 cursor-pointer text-xs transition-colors"
                            >
                              <ItemIcon
                                type="Workshop"
                                size="sm"
                                className="mr-1"
                              />
                              {ws.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
