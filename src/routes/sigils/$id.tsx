import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/sigils/$id")({
  component: SigilDetail,
})

function SigilDetail() {
  const { id } = Route.useParams()
  const { data: sigils = [] } = useQuery({
    queryKey: ["sigils"],
    queryFn: gameApi.sigils,
  })

  const item = sigils.find((s) => s.id === Number(id))
  if (!item) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/sigils"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Sigil" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {item.name}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Sigil</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground font-medium">
                  Found in:
                </span>{" "}
                {item.room} ({item.area})
              </p>
              <p>
                <span className="text-muted-foreground font-medium">
                  Source:
                </span>{" "}
                {item.source}
              </p>
              <p>
                <span className="text-muted-foreground font-medium">
                  Unlocks:
                </span>{" "}
                {item.door_unlocks}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
