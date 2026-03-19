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

export const Route = createFileRoute("/armor/$id")({
  component: ArmorDetail,
})

const ARMOR_MATS = ["Leather", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const SHIELD_MATS = ["Wood", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]

function ArmorDetail() {
  const { id } = Route.useParams()
  const [material, setMaterial] = useState<string | null>(null)

  const { data: armor = [] } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })

  const item = armor.find((a) => a.id === Number(id))
  if (!item) return null

  const materialData = material
    ? materials.find((m) => m.name === material)
    : undefined
  const validMaterials = item.armor_type === "Shield" ? SHIELD_MATS : ARMOR_MATS

  const baseStats: ItemStats = {
    str: item.str,
    int: item.int,
    agi: item.agi,
    gem_slots: item.gem_slots,
  }

  const effectiveStats = materialData
    ? computeEffectiveStats(baseStats, materialData)
    : baseStats

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/armor"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type={item.armor_type} size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {fmt(item.field_name)}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {item.armor_type}
              </p>
            </div>
            <div className="w-40">
              <MaterialSelect
                materials={validMaterials}
                value={material}
                onSelect={setMaterial}
              />
            </div>
          </div>
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
