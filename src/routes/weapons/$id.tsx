import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { MaterialSelect } from "@/components/material-select"
import { StatDisplay } from "@/components/stat-display"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, fmt } from "@/lib/game-api"
import { computeEffectiveStats, type ItemStats } from "@/lib/item-stats"

export const Route = createFileRoute("/weapons/$id")({
  component: WeaponDetail,
})

const WEAPON_HANDS: Record<string, string> = {
  Dagger: "1H",
  Sword: "1H",
  "Axe / Mace": "1H",
  "Great Sword": "2H",
  "Great Axe": "2H",
  Staff: "2H",
  "Heavy Mace": "2H",
  Polearm: "2H",
  Crossbow: "2H",
}

const BLADE_MATS = ["Bronze", "Iron", "Hagane", "Silver", "Damascus"]

function WeaponDetail() {
  const { id } = Route.useParams()
  const [material, setMaterial] = useState<string | null>(null)

  const { data: weapons = [] } = useQuery({
    queryKey: ["weapons"],
    queryFn: gameApi.weapons,
  })
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })

  const weapon = weapons.find((w) => w.id === Number(id))
  if (!weapon) return null

  const hands = WEAPON_HANDS[weapon.blade_type]
  const materialData = material
    ? materials.find((m) => m.name === material)
    : undefined

  const baseStats: ItemStats = {
    str: weapon.str,
    int: weapon.int,
    agi: weapon.agi,
    range: weapon.range,
    damage: weapon.damage,
    risk: weapon.risk,
    damage_type: weapon.damage_type,
  }

  const effectiveStats =
    baseStats && materialData
      ? computeEffectiveStats(baseStats, materialData)
      : baseStats

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/weapons"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex gap-6">
          {/* Left: image, name, type, material */}
          <div className="flex flex-col items-center gap-3">
            <ItemIcon
              type={weapon.blade_type}
              size="lg"
              className="rounded-lg"
            />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {fmt(weapon.field_name)}
              </h2>
              <div className="text-muted-foreground mt-0.5 flex items-center justify-center gap-2 text-sm">
                <span>{weapon.blade_type}</span>
                {hands && (
                  <>
                    <span>·</span>
                    <span>{hands}</span>
                  </>
                )}
              </div>
            </div>
            <div className="w-40">
              <MaterialSelect
                materials={BLADE_MATS}
                value={material}
                onSelect={setMaterial}
              />
            </div>
          </div>

          {/* Right: damage type, stats, affinities */}
          <div className="flex flex-1 flex-col items-center gap-3">
            <StatDisplay
              stats={effectiveStats}
              showAffinities={!!materialData}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
