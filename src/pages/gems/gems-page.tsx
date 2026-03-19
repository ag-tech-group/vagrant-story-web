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
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search gems..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/gems/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
