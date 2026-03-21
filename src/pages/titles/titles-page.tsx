import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Title } from "@/lib/game-api"

export function TitlesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["titles"],
    queryFn: gameApi.titles,
  })

  const columns = useMemo<ColumnDef<Title>[]>(
    () => [
      {
        accessorKey: "number",
        header: "No.",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm font-medium">
            {String(getValue<number>()).padStart(2, "0")}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Title",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ItemIcon type="Title" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "requirement",
        header: "Requirement",
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
      searchPlaceholder="Search titles..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/titles/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
