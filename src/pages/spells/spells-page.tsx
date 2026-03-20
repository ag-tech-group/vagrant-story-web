import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Spell } from "@/lib/game-api"

const columns: ColumnDef<Spell>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Spell" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    filterFn: "equals",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-sm">{v}</span>
    },
  },
  {
    accessorKey: "mp_cost",
    header: "MP",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-primary text-sm font-medium">{v}</span>
    },
  },
  {
    accessorKey: "affinity",
    header: "Affinity",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      if (!v || v === "None")
        return <span className="text-muted-foreground">-</span>
      return <span className="text-sm">{v}</span>
    },
  },
  {
    accessorKey: "targeting",
    header: "Target",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-muted-foreground text-sm">{v}</span>
    },
  },
  {
    accessorKey: "effect",
    header: "Effect",
    enableSorting: false,
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return (
        <span className="text-muted-foreground line-clamp-1 text-sm">{v}</span>
      )
    },
  },
]

export function SpellsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["spells"],
    queryFn: gameApi.spells,
  })

  const enriched = useMemo(
    () => data.map((s) => ({ ...s, _display: s.name })),
    [data]
  )

  const categoryFilters = useMemo<ColumnFilter[]>(() => {
    const categories = [
      ...new Set(data.map((s) => s.category).filter(Boolean)),
    ].sort()
    return [{ column: "category", label: "Category", options: categories }]
  }, [data])

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search spells..."
      isLoading={isLoading}
      filters={categoryFilters}
      getRowLink={(row) => ({
        to: "/spells/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
