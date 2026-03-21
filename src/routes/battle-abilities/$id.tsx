import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { AbilityTypeBadge } from "@/components/stat-display"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/battle-abilities/$id")({
  component: BattleAbilityDetail,
})

function BattleAbilityDetail() {
  const { id } = Route.useParams()
  const { data: abilities = [] } = useQuery({
    queryKey: ["battle-abilities"],
    queryFn: gameApi.battleAbilities,
  })

  const ability = abilities.find((a) => a.id === Number(id))
  if (!ability) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/battle-abilities"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Battle Ability" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {ability.name}
              </h2>
              <div className="mt-1">
                <AbilityTypeBadge type={ability.ability_type} />
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive">RISK {ability.risk_cost}</Badge>
              <Badge variant="outline">{ability.power}</Badge>
            </div>
            <p className="text-sm">
              <span className="font-medium">Effect:</span> {ability.effect}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
