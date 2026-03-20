import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DamageTypeBadge } from "@/components/stat-display"
import { ItemIcon } from "@/components/item-icon"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { gameApi, fmt, type Weapon } from "@/lib/game-api"

const columns: ColumnDef<Weapon>[] = [
  {
    accessorKey: "field_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type={row.original.blade_type} />
        <span className="font-medium">{fmt(row.original.field_name)}</span>
      </div>
    ),
  },
  { accessorKey: "blade_type", header: "Type", filterFn: "equals" },
  {
    accessorKey: "damage_type",
    header: "Damage",
    cell: ({ getValue }) => <DamageTypeBadge type={getValue<string>()} />,
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
  { accessorKey: "range", header: "Range" },
  { accessorKey: "damage", header: "DMG" },
  { accessorKey: "risk", header: "Risk" },
]

export function WeaponsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["weapons"],
    queryFn: gameApi.weapons,
  })

  const enriched = useMemo(
    () => data.map((w) => ({ ...w, _display: fmt(w.field_name) })),
    [data]
  )

  const typeFilters = useMemo<ColumnFilter[]>(() => {
    const types = [...new Set(data.map((w) => w.blade_type))].sort()
    return [{ column: "blade_type", label: "Type", options: types }]
  }, [data])

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search weapons..."
      isLoading={isLoading}
      filters={typeFilters}
      getRowLink={(row) => ({
        to: "/weapons/$id",
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
