import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Grimoire, type Spell } from "@/lib/game-api"

export function GrimoiresPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })
  const { data: spells = [] } = useQuery({
    queryKey: ["spells"],
    queryFn: gameApi.spells,
  })

  const spellMap = useMemo(() => {
    const map = new Map<string, Spell>()
    for (const s of spells) map.set(s.name, s)
    return map
  }, [spells])

  const columns = useMemo<ColumnDef<Grimoire>[]>(
    () => [
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
        cell: ({ row }) => {
          const spell = spellMap.get(row.original.spell_name)
          if (spell) {
            return (
              <Link
                to="/spells/$id"
                params={{ id: String(spell.id) }}
                className="text-primary text-sm font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.original.spell_name}
              </Link>
            )
          }
          return (
            <span className="text-primary text-sm font-medium">
              {row.original.spell_name}
            </span>
          )
        },
      },
      {
        accessorKey: "area",
        header: "Area",
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue<string>()}
          </span>
        ),
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
    ],
    [spellMap]
  )

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
