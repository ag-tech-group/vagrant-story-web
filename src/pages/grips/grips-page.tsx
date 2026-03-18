import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { gameApi, fmt, type Grip } from "@/lib/game-api"

const columns: ColumnDef<Grip>[] = [
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
  { accessorKey: "grip_type", header: "Type" },
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
    accessorKey: "dp",
    header: "DP",
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>()
      return v != null ? v : <span className="text-muted-foreground">-</span>
    },
  },
  {
    accessorKey: "pp",
    header: "PP",
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>()
      return v != null ? v : <span className="text-muted-foreground">-</span>
    },
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl tracking-wide sm:text-4xl">Grips</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Grips modify weapon stats and can be swapped between weapons
        </p>
      </div>
      <DataTable
        data={enriched}
        columns={columns}
        searchPlaceholder="Search grips..."
        isLoading={isLoading}
      />
    </div>
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
