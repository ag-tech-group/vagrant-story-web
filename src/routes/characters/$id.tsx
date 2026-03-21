import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export const Route = createFileRoute("/characters/$id")({
  component: CharacterDetail,
})

function CharacterDetail() {
  const { id } = Route.useParams()
  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: gameApi.characters,
  })

  const character = characters.find((c) => c.id === Number(id))
  if (!character) return null

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/characters"
            className="text-muted-foreground hover:text-foreground -mt-2 -mr-2 p-1"
          >
            <X className="size-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <ItemIcon type="Character" size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {character.name}
              </h2>
              <div className="mt-1">
                <Badge variant="secondary">{character.role}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <p className="text-sm">{character.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
