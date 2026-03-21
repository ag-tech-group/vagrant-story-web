import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/rankings/$id")({
  component: RankingDetail,
})

function RankingDetail() {
  const { id } = Route.useParams()
  const { data: rankings = [] } = useQuery({
    queryKey: ["rankings"],
    queryFn: gameApi.rankings,
  })

  const ranking = rankings.find((r) => r.id === Number(id))
  if (!ranking) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/rankings"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Ranking" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {ranking.name}
              </h2>
              <div className="mt-1">
                <Badge variant="secondary">
                  Level {String(ranking.level).padStart(2, "0")}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <p className="text-sm">
              <span className="font-medium">Requirements:</span>{" "}
              {ranking.requirement}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
