import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/titles/$id")({
  component: TitleDetail,
})

function TitleDetail() {
  const { id } = Route.useParams()
  const { data: titles = [] } = useQuery({
    queryKey: ["titles"],
    queryFn: gameApi.titles,
  })

  const title = titles.find((t) => t.id === Number(id))
  if (!title) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/titles"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Title" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {title.name}
              </h2>
              <div className="mt-1">
                <Badge variant="secondary">
                  No. {String(title.number).padStart(2, "0")}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <p className="text-sm">
              <span className="font-medium">Requirement:</span>{" "}
              {title.requirement}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
