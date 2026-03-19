import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { gameApi, fmt } from "@/lib/game-api"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/accessories/$id")({
  component: AccessoryDetail,
})

function AccessoryDetail() {
  const { id } = Route.useParams()
  const { data: armor = [] } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })

  const item = armor.find((a) => a.id === Number(id))
  if (!item) return null

  const hasStats = item.str !== 0 || item.int !== 0 || item.agi !== 0

  return (
    <Card className="border-primary/30 mx-auto max-w-3xl">
      <CardContent className="pt-6">
        <div className="flex w-full justify-end">
          <Link
            to="/accessories"
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
                {fmt(item.field_name)}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Accessory</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {hasStats && (
              <div className="flex flex-wrap justify-center gap-2">
                <StatBox label="STR" value={item.str} />
                <StatBox label="INT" value={item.int} />
                <StatBox label="AGI" value={item.agi} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 flex min-w-12 flex-col items-center rounded px-2.5 py-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          value > 0 && "text-green-400",
          value < 0 && "text-red-400",
          value === 0 && "text-muted-foreground"
        )}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  )
}
