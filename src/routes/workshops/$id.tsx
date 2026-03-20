import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
import { MaterialBadge } from "@/components/stat-display"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/workshops/$id")({
  component: WorkshopDetail,
})

function WorkshopDetail() {
  const { id } = Route.useParams()
  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops"],
    queryFn: gameApi.workshops,
  })

  const item = workshops.find((w) => w.id === Number(id))
  if (!item) return null

  const materials = item.available_materials
    .split(", ")
    .filter((m) => m.trim().length > 0)

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/workshops"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Workshop" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {item.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Workshop</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <p className="text-sm">
              <span className="text-muted-foreground font-medium">
                Location:
              </span>{" "}
              {item.area}
            </p>
            <div>
              <p className="text-muted-foreground mb-1.5 text-sm font-medium">
                Available Materials:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {materials.map((mat) => (
                  <MaterialBadge key={mat} mat={mat} />
                ))}
              </div>
            </div>
            {item.description && (
              <p className="text-muted-foreground text-sm">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
