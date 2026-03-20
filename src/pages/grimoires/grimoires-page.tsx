import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Grimoire } from "@/lib/game-api"

const columns: ColumnDef<Grimoire>[] = [
  {
    accessorKey: "name",
    header: "Grimoire",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Grimoire" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "spell_name",
    header: "Spell",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-primary text-sm font-medium">{v}</span>
    },
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
    accessorKey: "drop_rate",
    header: "Rate",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      if (!v) return <span className="text-muted-foreground">Once</span>
      return <span className="text-sm">{v}</span>
    },
  },
]

export function GrimoiresPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })

  const enriched = useMemo(
    () => data.map((g) => ({ ...g, _display: g.name })),
    [data]
  )

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search grimoires or spells..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/grimoires/$id",
        params: { id: String(row.original.id) },
      })}
      pageSize={25}
    />
  )
}
