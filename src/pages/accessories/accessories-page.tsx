import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { gameApi, fmt, type Armor } from "@/lib/game-api"

const columns: ColumnDef<Armor>[] = [
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
]

export function AccessoriesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })

  const accessories = useMemo(
    () =>
      data
        .filter((a) => a.armor_type === "Accessory")
        .map((a) => ({ ...a, _display: fmt(a.field_name) })),
    [data]
  )

  return (
    <DataTable
      data={accessories}
      columns={columns}
      searchPlaceholder="Search accessories..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/accessories/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
