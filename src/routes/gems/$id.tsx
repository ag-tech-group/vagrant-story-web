import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, fmt } from "@/lib/game-api"
import { cn } from "@/lib/utils"

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
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type={"Gem"} size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {fmt(gem.field_name)}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Gem</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="bg-muted/50 flex flex-col items-center rounded px-4 py-2">
              <span className="text-muted-foreground text-xs">Affinity</span>
              <span className="text-sm font-medium">{gem.affinity_type}</span>
            </div>
            <div className="bg-muted/50 flex flex-col items-center rounded px-4 py-2">
              <span className="text-muted-foreground text-xs">Magnitude</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  gem.magnitude > 0 ? "text-green-400" : "text-muted-foreground"
                )}
              >
                {gem.magnitude > 0 ? `+${gem.magnitude}` : gem.magnitude}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
