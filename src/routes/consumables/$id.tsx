import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/consumables/$id")({
  component: ConsumableDetail,
})

function ConsumableDetail() {
  const { id } = Route.useParams()
  const { data: consumables = [] } = useQuery({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })

  const item = consumables.find((c) => c.id === Number(id))
  if (!item) return null

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
            <ItemIcon type="Consumable" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {item.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Consumable</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {item.description ? (
              <p className="text-center text-sm">{item.description}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No description available
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
