import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { gameApi, type Consumable } from "@/lib/game-api"

interface Effect {
  type: string
  value: number
  target: string
  modifier: string
}

const columns: ColumnDef<Consumable>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="bg-muted size-10 shrink-0 rounded" />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    id: "effects",
    header: "Effects",
    cell: ({ row }) => {
      const effects = row.original.effects as Effect[] | null | undefined
      if (!effects || !Array.isArray(effects) || effects.length === 0) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {effects.map((e, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {e.modifier} {e.value > 0 ? `+${e.value}` : e.value}
            </Badge>
          ))}
        </div>
      )
    },
    enableSorting: false,
  },
]

export function ConsumablesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })

  const enriched = useMemo(
    () => data.map((c) => ({ ...c, _display: c.name })),
    [data]
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl tracking-wide sm:text-4xl">Consumables</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Items that can be used from inventory during gameplay
        </p>
      </div>
      <DataTable
        data={enriched}
        columns={columns}
        searchPlaceholder="Search consumables..."
        isLoading={isLoading}
      />
    </div>
  )
}
