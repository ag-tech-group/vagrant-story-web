import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { AbilityTypeBadge } from "@/components/stat-display"
import { gameApi, type BattleAbility } from "@/lib/game-api"

export function BattleAbilitiesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["battle-abilities"],
    queryFn: gameApi.battleAbilities,
  })

  const columns = useMemo<ColumnDef<BattleAbility>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ItemIcon type="Battle Ability" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "ability_type",
        header: "Type",
        filterFn: "equals",
        cell: ({ getValue }) => <AbilityTypeBadge type={getValue<string>()} />,
      },
      {
        accessorKey: "risk_cost",
        header: "RISK Cost",
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-red-400">
            {getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: "effect",
        header: "Effect",
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "power",
        header: "Power",
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

  const typeFilters = useMemo<ColumnFilter[]>(() => {
    const types = [
      ...new Set(data.map((s) => s.ability_type).filter(Boolean)),
    ].sort()
    return [{ column: "ability_type", label: "Type", options: types }]
  }, [data])

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search battle abilities..."
      isLoading={isLoading}
      filters={typeFilters}
      getRowLink={(row) => ({
        to: "/battle-abilities/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
