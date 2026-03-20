import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, fmt, type Grip } from "@/lib/game-api"

function StatCell({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>
  return (
    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
      {value > 0 ? `+${value}` : value}
    </span>
  )
}

const columns: ColumnDef<Grip>[] = [
  {
    accessorKey: "field_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Grip" />
        <span className="font-medium">{fmt(row.original.field_name)}</span>
      </div>
    ),
  },
  {
    accessorKey: "grip_type",
    header: "Type",
    filterFn: "equals",
  },
  {
    accessorKey: "compatible_weapons",
    header: "Compatible",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-xs">
        {getValue<string>() || "-"}
      </span>
    ),
    enableSorting: false,
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
    accessorKey: "blunt",
    header: "Blt",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "edged",
    header: "Edg",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "piercing",
    header: "Prc",
    cell: ({ getValue }) => <StatCell value={getValue<number>()} />,
  },
  {
    accessorKey: "gem_slots",
    header: "Gems",
  },
]

export function GripsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["grips"],
    queryFn: gameApi.grips,
  })

  const enriched = useMemo(
    () => data.map((g) => ({ ...g, _display: fmt(g.field_name) })),
    [data]
  )

  const typeFilters = useMemo<ColumnFilter[]>(() => {
    const types = [
      ...new Set(data.map((g) => g.grip_type).filter(Boolean)),
    ].sort()
    return [{ column: "grip_type", label: "Type", options: types }]
  }, [data])

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search grips..."
      isLoading={isLoading}
      filters={typeFilters}
      getRowLink={(row) => ({
        to: "/grips/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
