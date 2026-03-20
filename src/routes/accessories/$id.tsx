import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
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
            <ItemIcon type={"Accessory"} size="lg" className="rounded-lg" />
            <div className="text-center">
              <h2 className="text-2xl font-medium tracking-wide">
                {fmt(item.field_name)}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">Accessory</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center gap-3">
            {/* Core stats */}
            <div className="flex flex-wrap justify-center gap-1.5">
              <StatBox label="STR" value={item.str} />
              <StatBox label="INT" value={item.int} />
              <StatBox label="AGI" value={item.agi} />
            </div>
            {/* Damage type affinities */}
            <div className="flex flex-wrap justify-center gap-1.5">
              <StatBox label="Blt" value={item.blunt} />
              <StatBox label="Edg" value={item.edged} />
              <StatBox label="Prc" value={item.piercing} />
              <StatBox label="Phy" value={item.physical} />
            </div>
            {/* Class affinities */}
            <div className="flex flex-wrap justify-center gap-1.5">
              <StatBox label="Hum" value={item.human} />
              <StatBox label="Bst" value={item.beast} />
              <StatBox label="Und" value={item.undead} />
              <StatBox label="Phm" value={item.phantom} />
              <StatBox label="Drg" value={item.dragon} />
              <StatBox label="Evl" value={item.evil} />
            </div>
            {/* Elemental affinities */}
            <div className="flex flex-wrap justify-center gap-1.5">
              <StatBox label="Fir" value={item.fire} />
              <StatBox label="Wat" value={item.water} />
              <StatBox label="Wnd" value={item.wind} />
              <StatBox label="Ear" value={item.earth} />
              <StatBox label="Lit" value={item.light} />
              <StatBox label="Drk" value={item.dark} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 flex min-w-10 flex-col items-center rounded px-1.5 py-1">
      <span className="text-muted-foreground text-[11px]">{label}</span>
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
