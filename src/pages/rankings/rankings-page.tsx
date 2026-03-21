import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Ranking } from "@/lib/game-api"

export function RankingsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: gameApi.rankings,
  })

  const columns = useMemo<ColumnDef<Ranking>[]>(
    () => [
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm font-medium">
            {String(getValue<number>()).padStart(2, "0")}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Rank",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ItemIcon type="Ranking" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "requirement",
        header: "Requirements",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue<string>()}
          </span>
        ),
      },
    ],
    []
  )

  const enriched = useMemo(
    () => data.map((s) => ({ ...s, _display: s.name })),
    [data]
  )

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search rankings..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/rankings/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
