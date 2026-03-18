import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { gameApi, fmt, type Gem } from "@/lib/game-api"

const columns: ColumnDef<Gem>[] = [
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
  { accessorKey: "affinity_type", header: "Affinity" },
  { accessorKey: "magnitude", header: "Magnitude" },
]

export function GemsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["gems"],
    queryFn: gameApi.gems,
  })

  const enriched = useMemo(
    () => data.map((g) => ({ ...g, _display: fmt(g.field_name) })),
    [data]
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl tracking-wide sm:text-4xl">Gems</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gems can be attached to equipment with gem slots
        </p>
      </div>
      <DataTable
        data={enriched}
        columns={columns}
        searchPlaceholder="Search gems..."
        isLoading={isLoading}
      />
    </div>
  )
}
