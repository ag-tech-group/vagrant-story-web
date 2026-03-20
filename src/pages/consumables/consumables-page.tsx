import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { ItemIcon } from "@/components/item-icon"
import { DataTable } from "@/components/data-table"
import { gameApi, type Consumable } from "@/lib/game-api"

const columns: ColumnDef<Consumable>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Consumable" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Effect",
    cell: ({ row }) => {
      const desc = row.original.description
      if (!desc) return <span className="text-muted-foreground">-</span>
      return <span className="text-sm">{desc}</span>
    },
    enableSorting: false,
  },
  {
    accessorKey: "drop_rate",
    header: "Drop Rate",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      if (!v) return <span className="text-muted-foreground">-</span>
      return <span className="text-muted-foreground text-sm">{v}</span>
    },
  },
  {
    accessorKey: "drop_location",
    header: "Best Drop",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      if (!v) return <span className="text-muted-foreground">-</span>
      return <span className="text-muted-foreground text-sm">{v}</span>
    },
    enableSorting: false,
  },
]

export function ConsumablesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })

  const enriched = useMemo(
    () => data.map((c) => ({ ...c, _display: c.name })),
    [data]
  )

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search consumables..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/consumables/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
