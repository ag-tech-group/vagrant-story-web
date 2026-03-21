import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { DamageTypeBadge } from "@/components/stat-display"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/break-arts/$id")({
  component: BreakArtDetail,
})

function BreakArtDetail() {
  const { id } = Route.useParams()
  const { data: breakArts = [] } = useQuery({
    queryKey: ["break-arts"],
    queryFn: gameApi.breakArts,
  })

  const art = breakArts.find((a) => a.id === Number(id))
  if (!art) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/break-arts"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Break Art" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">{art.name}</h2>
              <div className="mt-1">
                <DamageTypeBadge type={art.damage_type} />
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <ItemIcon type={art.weapon_type} size="sm" className="mr-1" />
                {art.weapon_type}
              </Badge>
              <Badge variant="destructive">{art.hp_cost} HP</Badge>
              <Badge variant="outline">{art.attack_multiplier}x</Badge>
              <Badge variant="outline">{art.affinity}</Badge>
            </div>
            {art.special_effect && (
              <p className="text-sm">
                <span className="font-medium">Special:</span>{" "}
                {art.special_effect}
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              <span className="font-medium">Kills Required:</span>{" "}
              {art.kills_required}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
