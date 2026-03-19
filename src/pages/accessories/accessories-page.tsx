import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { ItemIcon } from "@/components/item-icon"
import { DataTable } from "@/components/data-table"
import { gameApi, fmt, type Armor } from "@/lib/game-api"

const columns: ColumnDef<Armor>[] = [
  {
    accessorKey: "field_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <ItemIcon type="Accessory" />
        <span className="font-medium">{fmt(row.original.field_name)}</span>
      </div>
    ),
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
]

export function AccessoriesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })

  const accessories = useMemo(
    () =>
      data
        .filter((a) => a.armor_type === "Accessory")
        .map((a) => ({ ...a, _display: fmt(a.field_name) })),
    [data]
  )

  return (
    <DataTable
      data={accessories}
      columns={columns}
      searchPlaceholder="Search accessories..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/accessories/$id",
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
