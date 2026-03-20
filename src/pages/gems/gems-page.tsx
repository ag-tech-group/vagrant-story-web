import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, fmt, type Gem } from "@/lib/game-api"

function StatCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>
  return (
    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
      {value > 0 ? `+${value}` : value}
    </span>
  )
}

const columns: ColumnDef<Gem>[] = [
  {
    accessorKey: "field_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Gem" />
        <span className="font-medium">{fmt(row.original.field_name)}</span>
      </div>
    ),
  },
  {
    accessorKey: "gem_type",
    header: "Type",
    filterFn: "equals",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return v || <span className="text-muted-foreground">-</span>
    },
  },
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
    header: "AGI",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "human",
    header: "Hum",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "beast",
    header: "Bst",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "undead",
    header: "Und",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "phantom",
    header: "Phm",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "dragon",
    header: "Drg",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "evil",
    header: "Evl",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
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

  const typeFilters = useMemo<ColumnFilter[]>(() => {
    const types = [
      ...new Set(data.map((g) => g.gem_type).filter(Boolean)),
    ].sort() as string[]
    return [{ column: "gem_type", label: "Type", options: types }]
  }, [data])

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search gems..."
      isLoading={isLoading}
      filters={typeFilters}
      getRowLink={(row) => ({
        to: "/gems/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
