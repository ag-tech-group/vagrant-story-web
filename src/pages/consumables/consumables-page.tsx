import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { gameApi, fmt, type Consumable } from "@/lib/game-api"

const columns: ColumnDef<Consumable>[] = [
  {
    accessorKey: "field_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="bg-muted size-10 shrink-0 rounded" />
        <span className="font-medium">{fmt(row.original.field_name)}</span>
      </div>
    ),
  },
  {
    id: "effects",
    header: "Effects",
    cell: ({ row }) => {
      const effects = row.original.effects
      if (!effects) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <span className="text-muted-foreground text-xs">
          {JSON.stringify(effects)}
        </span>
      )
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
    () => data.map((c) => ({ ...c, _display: fmt(c.field_name) })),
    [data]
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl tracking-wide sm:text-4xl">Consumables</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Items that can be used from inventory during gameplay
        </p>
      </div>
      <DataTable
        data={enriched}
        columns={columns}
        searchPlaceholder="Search consumables..."
        isLoading={isLoading}
      />
    </div>
  )
}
