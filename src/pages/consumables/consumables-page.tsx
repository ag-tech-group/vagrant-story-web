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

function formatEffect(e: Effect): string | null {
  const val = e.value
  // Broken C# parse artifacts
  if (typeof val === "string") return `${e.modifier} Random`
  // 32767 = max int16, means full restore
  if (val === 32767) return `${e.modifier} Full`
  if (val === 0) return null
  return `${e.modifier} ${val > 0 ? `+${val}` : val}`
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
          {effects.map((e, i) => {
            const label = formatEffect(e)
            if (!label) return null
            return (
              <Badge key={i} variant="secondary" className="text-xs">
                {label}
              </Badge>
            )
          })}
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
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search consumables..."
      isLoading={isLoading}
      getRowLink={(row) => ({
        to: "/consumables/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
