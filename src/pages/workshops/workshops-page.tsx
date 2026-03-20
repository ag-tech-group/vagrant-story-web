import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemIcon } from "@/components/item-icon"
import { gameApi } from "@/lib/game-api"

export function WorkshopsPage() {
  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ["workshops"],
    queryFn: gameApi.workshops,
  })

  if (isLoading) {
    return <p className="text-muted-foreground py-8 text-center">Loading...</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workshops.map((ws) => (
        <Link key={ws.id} to="/workshops/$id" params={{ id: String(ws.id) }}>
          <Card className="hover:border-primary/40 h-full transition-colors">
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ItemIcon type="Workshop" />
                  <h3 className="font-sans text-lg font-medium">{ws.name}</h3>
                </div>
                <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0" />
              </div>
              <p className="text-muted-foreground text-sm">{ws.area}</p>
              <div className="flex flex-wrap gap-1.5">
                {ws.available_materials.split(", ").map((mat) => (
                  <Badge key={mat} variant="secondary" className="text-xs">
                    {mat}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-sm">{ws.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
