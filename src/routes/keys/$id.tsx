import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/keys/$id")({
  component: KeyDetail,
})

function KeyDetail() {
  const { id } = Route.useParams()
  const { data: keys = [] } = useQuery({
    queryKey: ["keys"],
    queryFn: gameApi.keys,
  })

  const item = keys.find((k) => k.id === Number(id))
  if (!item) return null

  const locations = item.locations_used
    .split(", ")
    .filter((l) => l.trim().length > 0)

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/keys"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Key" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {item.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Key</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground font-medium">
                  Found in:
                </span>{" "}
                {item.room ? `${item.room} (${item.area})` : item.area}
              </p>
              <p>
                <span className="text-muted-foreground font-medium">
                  Source:
                </span>{" "}
                {item.source}
              </p>
            </div>
            {locations.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-sm font-medium">
                  Opens doors in:
                </p>
                <ul className="space-y-0.5 text-sm">
                  {locations.map((loc, i) => (
                    <li key={i} className="text-muted-foreground">
                      {loc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
