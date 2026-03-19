import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/consumables/$id")({
  component: ConsumableDetail,
})

interface Effect {
  type: string
  value: number
  target: string
  modifier: string
}

function formatEffect(e: Effect): string | null {
  const val = e.value
  if (typeof val === "string") return `${e.modifier} Random`
  if (val === 32767) return `${e.modifier} Full`
  if (val === 0) return null
  return `${e.modifier} ${val > 0 ? `+${val}` : val}`
}

function ConsumableDetail() {
  const { id } = Route.useParams()
  const { data: consumables = [] } = useQuery({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })

  const item = consumables.find((c) => c.id === Number(id))
  if (!item) return null

  const effects = (item.effects as Effect[] | null | undefined) ?? []

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/consumables"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-muted flex size-32 shrink-0 items-center justify-center rounded-lg">
              <span className="text-muted-foreground text-xs">Image</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {item.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Consumable</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {effects.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                {effects.map((e, i) => {
                  const label = formatEffect(e)
                  if (!label) return null
                  return (
                    <Badge key={i} variant="secondary">
                      {label}
                    </Badge>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No effects</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
