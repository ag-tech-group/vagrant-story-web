import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Spell, type Grimoire } from "@/lib/game-api"

export function SpellsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["spells"],
    queryFn: gameApi.spells,
  })
  const { data: grimoires = [] } = useQuery({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })

  const grimoireMap = useMemo(() => {
    const map = new Map<string, Grimoire>()
    for (const g of grimoires) {
      if (!map.has(g.name)) map.set(g.name, g)
    }
    return map
  }, [grimoires])

  const columns = useMemo<ColumnDef<Spell>[]>(
    () => [
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
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "mp_cost",
        header: "MP",
        cell: ({ getValue }) => (
          <span className="text-primary text-sm font-medium">
            {getValue<string>()}
          </span>
        ),
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
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "grimoire",
        header: "Grimoire",
        cell: ({ row }) => {
          const name = row.original.grimoire
          if (!name) return <span className="text-muted-foreground">-</span>
          const grim = grimoireMap.get(name)
          if (grim) {
            return (
              <Link
                to="/grimoires/$id"
                params={{ id: String(grim.id) }}
                className="text-primary text-sm font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {name}
              </Link>
            )
          }
          return <span className="text-sm">{name}</span>
        },
      },
      {
        accessorKey: "effect",
        header: "Effect",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground line-clamp-1 text-sm">
            {getValue<string>()}
          </span>
        ),
      },
    ],
    [grimoireMap]
  )

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
