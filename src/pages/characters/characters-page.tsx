import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Character } from "@/lib/game-api"

export function CharactersPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["characters"],
    queryFn: gameApi.characters,
  })

  const columns = useMemo<ColumnDef<Character>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ItemIcon type="Character" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        enableSorting: false,
        cell: ({ getValue }) => {
          const desc = getValue<string>()
          const truncated = desc.length > 80 ? desc.slice(0, 80) + "..." : desc
          return (
            <span className="text-muted-foreground text-sm">{truncated}</span>
          )
        },
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
      searchPlaceholder="Search characters..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/characters/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
