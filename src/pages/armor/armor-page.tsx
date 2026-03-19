import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable, type ColumnFilter } from "@/components/data-table"
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
  { accessorKey: "armor_type", header: "Type", filterFn: "equals" },
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
  { accessorKey: "gem_slots", header: "Gem Slots" },
]

export function ArmorPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })

  const filtered = useMemo(
    () => data.filter((a) => a.armor_type !== "Accessory"),
    [data]
  )

  const enriched = useMemo(
    () => filtered.map((a) => ({ ...a, _display: fmt(a.field_name) })),
    [filtered]
  )

  const typeFilters = useMemo<ColumnFilter[]>(() => {
    const types = [...new Set(data.map((a) => a.armor_type))].sort()
    return [{ column: "armor_type", label: "Type", options: types }]
  }, [data])

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search armor..."
      isLoading={isLoading}
      filters={typeFilters}
      getRowLink={(row) => ({
        to: "/armor/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}

function StatCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>
  return (
    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
      {value > 0 ? `+${value}` : value}
    </span>
  )
}
