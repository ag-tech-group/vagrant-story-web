import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Area, type Room } from "@/lib/game-api"

type AreaRow = Area & { room_count: number; _display: string }

export function AreasPage() {
  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ["areas"],
    queryFn: gameApi.areas,
  })
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: gameApi.rooms,
  })

  const enriched = useMemo(() => {
    const countByArea = new Map<number, number>()
    rooms.forEach((r: Room) => {
      countByArea.set(r.area_id, (countByArea.get(r.area_id) || 0) + 1)
    })
    return areas.map((a) => ({
      ...a,
      room_count: countByArea.get(a.id) || 0,
      _display: a.name,
    }))
  }, [areas, rooms])

  const columns: ColumnDef<AreaRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Area",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ItemIcon type="Area" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "room_count",
        header: "Rooms",
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className="text-muted-foreground text-sm">
              {v} {v === 1 ? "room" : "rooms"}
            </span>
          )
        },
      },
    ],
    []
  )

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search areas..."
      isLoading={areasLoading || roomsLoading}
      getRowLink={(row) => ({
        to: "/areas/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
