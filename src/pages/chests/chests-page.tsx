import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { Badge } from "@/components/ui/badge"
import { gameApi, type Chest } from "@/lib/game-api"

const columns: ColumnDef<Chest & { _display: string }>[] = [
  {
    accessorKey: "area",
    header: "Area",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Chest" />
        <span className="font-medium">{row.original.area}</span>
      </div>
    ),
  },
  {
    accessorKey: "room",
    header: "Room",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="min-w-44 text-sm">{v}</span>
    },
  },
  {
    accessorKey: "lock_type",
    header: "Lock",
    cell: ({ getValue }) => {
      const v = getValue<string | null>()
      if (!v) return null
      return (
        <Badge variant="outline" className="text-xs">
          {v}
        </Badge>
      )
    },
  },
]

const AREA_OPTIONS = [
  "Wine Cellar",
  "Catacombs",
  "Sanctum",
  "Abandoned Mines B1",
  "Abandoned Mines B2",
  "Limestone Quarry",
  "Temple of Kiltia",
  "Great Cathedral L1",
  "Great Cathedral L2",
  "Forgotten Pathway",
  "Escapeway",
  "Iron Maiden B1",
  "Iron Maiden B2",
  "Iron Maiden B3",
  "Undercity West",
  "Undercity East",
  "The Keep",
  "Snowfly Forest",
  "Snowfly Forest East",
  "Town Centre South",
  "Town Centre East",
]

export function ChestsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["chests"],
    queryFn: gameApi.chests,
  })

  const enriched = useMemo(
    () => data.map((c) => ({ ...c, _display: `${c.area} ${c.room}` })),
    [data]
  )

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search chests..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/chests/$id",
        params: { id: String(row.original.id) },
      })}
      filters={[
        {
          column: "area",
          label: "Area",
          options: AREA_OPTIONS,
        },
      ]}
    />
  )
}
