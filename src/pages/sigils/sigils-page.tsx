import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Sigil } from "@/lib/game-api"

const columns: ColumnDef<Sigil>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Sigil" />
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
  {
    accessorKey: "door_unlocks",
    header: "Unlocks",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return (
        <span className="text-muted-foreground line-clamp-1 text-sm">{v}</span>
      )
    },
  },
]

export function SigilsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["sigils"],
    queryFn: gameApi.sigils,
  })

  const enriched = useMemo(
    () => data.map((s) => ({ ...s, _display: s.name })),
    [data]
  )

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search sigils..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/sigils/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
