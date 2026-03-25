import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { ItemIcon } from "@/components/item-icon"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { gameApi, type Enemy } from "@/lib/game-api"

const columns: ColumnDef<Enemy>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Enemy" />
        <span className="font-medium">{row.original.name}</span>
        {row.original.is_boss && (
          <Badge
            variant="outline"
            className="border-amber-500/50 bg-amber-600/20 text-[10px] text-amber-300"
          >
            Boss
          </Badge>
        )}
      </div>
    ),
  },
  { accessorKey: "enemy_class", header: "Class", filterFn: "equals" },
  { accessorKey: "hp", header: "HP" },
  { accessorKey: "mp", header: "MP" },
  {
    accessorKey: "str",
    header: "STR",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "int",
    header: "INT",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "agi",
    header: "AGL",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  { accessorKey: "movement", header: "Movement" },
]

const ENEMY_CLASSES = ["Human", "Beast", "Undead", "Phantom", "Dragon", "Evil"]

export function BestiaryPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["enemies"],
    queryFn: gameApi.enemies,
  })

  const classFilters = useMemo<ColumnFilter[]>(() => {
    const classes = [...new Set(data.map((e) => e.enemy_class))].sort(
      (a, b) => {
        const ai = ENEMY_CLASSES.indexOf(a)
        const bi = ENEMY_CLASSES.indexOf(b)
        if (ai !== -1 && bi !== -1) return ai - bi
        if (ai !== -1) return -1
        if (bi !== -1) return 1
        return a.localeCompare(b)
      }
    )
    return [{ column: "enemy_class", label: "Class", options: classes }]
  }, [data])

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="Search enemies..."
      isLoading={isLoading}
      filters={classFilters}
      getRowLink={(row) => ({
        to: "/bestiary/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}

function StatCell({ value }: { value: number }) {
  return <span>{value}</span>
}
