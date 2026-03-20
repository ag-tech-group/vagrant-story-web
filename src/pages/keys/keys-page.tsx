import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Key } from "@/lib/game-api"

const columns: ColumnDef<Key>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Key" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "area",
    header: "Area",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-sm">{v}</span>
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-muted-foreground text-sm">{v}</span>
    },
  },
]

export function KeysPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["keys"],
    queryFn: gameApi.keys,
  })

  const enriched = useMemo(
    () => data.map((k) => ({ ...k, _display: k.name })),
    [data]
  )

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search keys..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/keys/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
