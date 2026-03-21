import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable, type ColumnFilter } from "@/components/data-table"
import { ItemIcon } from "@/components/item-icon"
import { DamageTypeBadge } from "@/components/stat-display"
import { gameApi, type BreakArt } from "@/lib/game-api"

export function BreakArtsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["break-arts"],
    queryFn: gameApi.breakArts,
  })

  const columns = useMemo<ColumnDef<BreakArt>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <ItemIcon type="Break Art" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "weapon_type",
        header: "Weapon Type",
        filterFn: "equals",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-2">
            <ItemIcon type={getValue<string>()} size="sm" />
            <span className="text-sm">{getValue<string>()}</span>
          </div>
        ),
      },
      {
        accessorKey: "hp_cost",
        header: "HP Cost",
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-red-400">
            {getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: "attack_multiplier",
        header: "Multiplier",
        cell: ({ getValue }) => (
          <span className="text-primary text-sm font-medium">
            {getValue<string>()}x
          </span>
        ),
      },
      {
        accessorKey: "damage_type",
        header: "Type",
        cell: ({ getValue }) => <DamageTypeBadge type={getValue<string>()} />,
      },
      {
        accessorKey: "affinity",
        header: "Affinity",
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "special_effect",
        header: "Special",
        cell: ({ getValue }) => {
          const v = getValue<string | null>()
          if (!v) return <span className="text-muted-foreground">-</span>
          return <span className="text-sm">{v}</span>
        },
      },
      {
        accessorKey: "kills_required",
        header: "Kills Req",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue<number>()}
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

  const weaponTypeFilters = useMemo<ColumnFilter[]>(() => {
    const types = [
      ...new Set(data.map((s) => s.weapon_type).filter(Boolean)),
    ].sort()
    return [{ column: "weapon_type", label: "Weapon Type", options: types }]
  }, [data])

  return (
    <DataTable
      data={enriched}
      columns={columns}
      searchPlaceholder="Search break arts..."
      isLoading={isLoading}
      filters={weaponTypeFilters}
      getRowLink={(row) => ({
        to: "/break-arts/$id",
        params: { id: String(row.original.id) },
      })}
    />
  )
}
