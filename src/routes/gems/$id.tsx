import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
import { StatDisplay } from "@/components/stat-display"
import { gameApi, fmt } from "@/lib/game-api"
import type { ItemStats } from "@/lib/item-stats"

export const Route = createFileRoute("/gems/$id")({
  component: GemDetail,
})

function GemDetail() {
  const { id } = Route.useParams()
  const { data: gems = [] } = useQuery({
    queryKey: ["gems"],
    queryFn: gameApi.gems,
  })

  const gem = gems.find((g) => g.id === Number(id))
  if (!gem) return null

  const stats: ItemStats & Record<string, number> = {
    str: gem.str,
    int: gem.int,
    agi: gem.agi,
    human: gem.human,
    beast: gem.beast,
    undead: gem.undead,
    phantom: gem.phantom,
    dragon: gem.dragon,
    evil: gem.evil,
    fire: gem.fire,
    water: gem.water,
    wind: gem.wind,
    earth: gem.earth,
    light: gem.light,
    dark: gem.dark,
  }

  const hasAffinities = Object.entries(stats).some(
    ([k, v]) => !["str", "int", "agi"].includes(k) && v !== 0
  )

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/gems"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Gem" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {fmt(gem.field_name)}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {gem.gem_type ? `${gem.gem_type} Gem` : "Gem"}
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center gap-3">
            <StatDisplay stats={stats} showAffinities={hasAffinities} />
            {gem.description && (
              <p className="text-muted-foreground mt-2 text-center text-sm italic">
                {gem.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
