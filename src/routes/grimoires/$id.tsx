import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Spell } from "@/lib/game-api"

export const Route = createFileRoute("/grimoires/$id")({
  component: GrimoireDetail,
})

function GrimoireDetail() {
  const { id } = Route.useParams()
  const { data: grimoires = [] } = useQuery({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })

  const { data: spells = [] } = useQuery({
    queryKey: ["spells"],
    queryFn: gameApi.spells,
  })

  const item = grimoires.find((g) => g.id === Number(id))
  if (!item) return null

  const linkedSpell = spells.find((s: Spell) => s.name === item.spell_name)

  const areas = item.areas.split(", ").filter(Boolean)
  const sources = item.sources.split(", ").filter(Boolean)
  const rates = item.drop_rates.split(", ").filter(Boolean)

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
        <div className="flex flex-col gap-6 sm:flex-row">
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
            <p className="text-sm">
              <span className="text-muted-foreground font-medium">Spell:</span>{" "}
              {linkedSpell ? (
                <Link
                  to="/spells/$id"
                  params={{ id: String(linkedSpell.id) }}
                  className="text-primary hover:underline"
                >
                  {item.spell_name}
                </Link>
              ) : (
                item.spell_name
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.repeatable && <Badge variant="outline">Repeatable</Badge>}
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Sources
              </p>
              <div className="space-y-2">
                {areas.map((area, i) => (
                  <div
                    key={i}
                    className="bg-muted/50 flex items-center justify-between rounded px-3 py-2 text-sm"
                  >
                    <div>
                      <span>{area}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {sources[i] || "Unknown"}
                      </span>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {rates[i] || "Once"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
