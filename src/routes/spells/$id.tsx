import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Grimoire } from "@/lib/game-api"

export const Route = createFileRoute("/spells/$id")({
  component: SpellDetail,
})

function SpellDetail() {
  const { id } = Route.useParams()
  const { data: spells = [] } = useQuery({
    queryKey: ["spells"],
    queryFn: gameApi.spells,
  })

  const { data: grimoires = [] } = useQuery({
    queryKey: ["grimoires"],
    queryFn: gameApi.grimoires,
  })

  const spell = spells.find((s) => s.id === Number(id))
  if (!spell) return null

  const linkedGrimoire = grimoires.find(
    (g: Grimoire) => g.name === spell.grimoire
  )

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/spells"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Spell" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {spell.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {spell.category} Spell
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{spell.mp_cost} MP</Badge>
              {spell.affinity && spell.affinity !== "None" && (
                <Badge variant="outline">{spell.affinity}</Badge>
              )}
              <Badge variant="outline">{spell.targeting}</Badge>
            </div>
            <p className="text-sm">{spell.effect}</p>
            {spell.grimoire && (
              <p className="text-muted-foreground text-sm">
                <span className="font-medium">Grimoire:</span>{" "}
                {linkedGrimoire ? (
                  <Link
                    to="/grimoires/$id"
                    params={{ id: String(linkedGrimoire.id) }}
                    className="text-primary hover:underline"
                  >
                    Grimoire {spell.grimoire}
                  </Link>
                ) : (
                  <>Grimoire {spell.grimoire}</>
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
