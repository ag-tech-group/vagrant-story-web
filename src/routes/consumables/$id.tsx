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

  const details = [
    { label: "HP Restore", value: item.hp_restore },
    { label: "MP Restore", value: item.mp_restore },
    { label: "RISK Reduce", value: item.risk_reduce },
    { label: "Status Cure", value: item.status_cure },
    { label: "Permanent Stat", value: item.permanent_stat },
    { label: "Drop Rate", value: item.drop_rate },
    { label: "Drop Location", value: item.drop_location },
  ].filter((d) => d.value)

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
          <div className="flex flex-1 flex-col gap-3">
            {item.description ? (
              <p className="text-sm">{item.description}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No description available
              </p>
            )}
            {details.length > 0 && (
              <div className="space-y-1.5">
                {details.map((d) => (
                  <p key={d.label} className="text-sm">
                    <span className="text-muted-foreground font-medium">
                      {d.label}:
                    </span>{" "}
                    {d.value}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
