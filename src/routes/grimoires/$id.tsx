import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/grimoires/$id")({
  component: GrimoireDetail,
})

function GrimoireDetail() {
  const { id } = Route.useParams()
  const { data: grimoires = [] } = useQuery({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })

  const item = grimoires.find((g) => g.id === Number(id))
  if (!item) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/grimoires"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Grimoire" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                Grimoire {item.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Grimoire</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{item.spell_name}</Badge>
              {item.drop_rate ? (
                <Badge variant="outline">{item.drop_rate}</Badge>
              ) : (
                <Badge variant="outline">Once</Badge>
              )}
              {item.repeatable && <Badge variant="outline">Repeatable</Badge>}
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground font-medium">
                  Location:
                </span>{" "}
                {item.room} ({item.area})
              </p>
              <p>
                <span className="text-muted-foreground font-medium">
                  Source:
                </span>{" "}
                {item.source}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
