import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { gameApi, type Material } from "@/lib/game-api"
import { cn } from "@/lib/utils"

const CREATURE_TYPES = [
  "human",
  "beast",
  "undead",
  "phantom",
  "dragon",
  "evil",
] as const
const ELEMENT_TYPES = [
  "fire",
  "water",
  "wind",
  "earth",
  "light",
  "dark",
] as const

export function MaterialsPage() {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl tracking-wide sm:text-4xl">Materials</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Material properties affect weapon and armor stats
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <div className="space-y-6">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function MaterialCard({ material: m }: { material: Material }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>{m.name}</span>
          <span className="text-muted-foreground text-sm font-normal">
            Tier {m.tier}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat modifiers */}
        <div className="flex gap-6">
          <StatBadge label="STR" value={m.str_modifier} />
          <StatBadge label="INT" value={m.int_modifier} />
          <StatBadge label="AGI" value={m.agi_modifier} />
        </div>

        {/* Creature resistances */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Creature Affinity
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CREATURE_TYPES.map((type) => (
              <ResistBadge key={type} label={type} value={m[type] as number} />
            ))}
          </div>
        </div>

        {/* Element resistances */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Element Affinity
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ELEMENT_TYPES.map((type) => (
              <ResistBadge key={type} label={type} value={m[type] as number} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "text-lg font-medium",
          value > 0 && "text-green-400",
          value < 0 && "text-red-400",
          value === 0 && "text-muted-foreground"
        )}
      >
        {value > 0 ? `+${value}` : value}
      </p>
    </div>
  )
}

function ResistBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-md p-2 text-center">
      <p className="text-muted-foreground text-[10px] capitalize">{label}</p>
      <p
        className={cn(
          "text-sm font-medium",
          value > 0 && "text-green-400",
          value < 0 && "text-red-400",
          value === 0 && "text-muted-foreground"
        )}
      >
        {value > 0 ? `+${value}` : value}
      </p>
    </div>
  )
}
