import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2, RotateCcw, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemPicker, type PickerItem } from "@/components/item-picker"
import {
  EquipmentGridView,
  type GridSlotData,
} from "@/components/equipment-grid-view"
import { ItemIcon } from "@/components/item-icon"
import { gameApi, type Enemy } from "@/lib/game-api"
import type { InventoryItem } from "@/lib/inventory-api"
import {
  loadoutApi,
  type LoadoutResponse,
  type LoadoutResult,
} from "@/lib/inventory-api"
import { cn } from "@/lib/utils"

// ── Slot display order ──────────────────────────────────────────────

// ── Types ───────────────────────────────────────────────────────────

type Mode = "full" | "offense" | "defense"

interface LoadoutTabProps {
  items: InventoryItem[]
  inventoryId: number
}

// ── Main component ──────────────────────────────────────────────────

export function LoadoutTab({ items, inventoryId }: LoadoutTabProps) {
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("full")
  const [includeEquipped, setIncludeEquipped] = useState(true)
  const [includeBag, setIncludeBag] = useState(true)
  const [includeContainer, setIncludeContainer] = useState(true)
  const [result, setResult] = useState<LoadoutResponse | null>(null)

  const { data: enemies = [] } = useQuery({
    queryKey: ["enemies"],
    queryFn: gameApi.enemies,
  })

  // Build enemy picker items grouped by class
  const enemyPickerItems: PickerItem[] = useMemo(
    () =>
      enemies.map((e) => ({
        name: e.name,
        type: e.enemy_class,
        level: e.id,
      })),
    [enemies]
  )

  // Look up the selected enemy object for sending the request
  const selectedEnemyObj = useMemo(
    () => enemies.find((e) => e.name === selectedEnemy),
    [enemies, selectedEnemy]
  )

  const analyzeMutation = useMutation({
    mutationFn: () => {
      if (!selectedEnemyObj) throw new Error("No enemy selected")
      return loadoutApi.optimize({
        inventory_id: inventoryId,
        enemy_id: selectedEnemyObj.id,
        mode,
        include_equipped: includeEquipped,
        include_bag: includeBag,
        include_container: includeContainer,
      })
    },
    onSuccess: (data) => setResult(data),
  })

  const handleReset = () => {
    setSelectedEnemy(null)
    setMode("full")
    setResult(null)
    analyzeMutation.reset()
  }

  const canAnalyze = !!selectedEnemyObj && items.length > 0

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 lg:flex-nowrap">
        <div className="w-full min-w-[10rem] flex-1">
          <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
            Target Enemy
          </label>
          <ItemPicker
            items={enemyPickerItems}
            value={selectedEnemy}
            onSelect={(name) => {
              setSelectedEnemy(name)
              setResult(null)
              analyzeMutation.reset()
            }}
            placeholder="Search for enemy..."
            triggerClassName="!min-h-9 !h-9 py-1"
          />
        </div>

        <div className="shrink-0">
          <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
            Mode
          </label>
          <div className="flex h-9 items-center gap-1">
            {(["full", "offense", "defense"] as Mode[]).map((m) => (
              <Button
                key={m}
                variant={mode === m ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setMode(m)
                  setResult(null)
                }}
                className="h-8 px-3 text-xs capitalize"
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
            Include
          </label>
          <div className="flex h-9 items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={includeEquipped}
                onChange={(e) => setIncludeEquipped(e.target.checked)}
                className="accent-primary size-3.5"
              />
              <span className="text-muted-foreground">Equipped</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={includeBag}
                onChange={(e) => setIncludeBag(e.target.checked)}
                className="accent-primary size-3.5"
              />
              <span className="text-muted-foreground">Bag</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={includeContainer}
                onChange={(e) => setIncludeContainer(e.target.checked)}
                className="accent-primary size-3.5"
              />
              <span className="text-muted-foreground">Container</span>
            </label>
          </div>
        </div>

        <div className="shrink-0">
          <div className="mb-1 text-[11px]">&nbsp;</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9 gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Analyze button */}
      {canAnalyze && (
        <div className="flex justify-center py-2">
          <Button
            onClick={() => analyzeMutation.mutate()}
            size="lg"
            disabled={analyzeMutation.isPending}
            className="min-w-[16rem] text-base"
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : (
              <Zap className="mr-2 size-5" />
            )}
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
          </Button>
        </div>
      )}

      {/* Error */}
      {analyzeMutation.isError && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {String(analyzeMutation.error)}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.loadouts.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No loadout recommendations found for this enemy with the selected
              inventory items.
            </div>
          ) : (
            result.loadouts.map((loadout) => (
              <LoadoutCard
                key={loadout.rank}
                loadout={loadout}
                enemy={result.enemy}
                mode={mode}
                enemies={enemies}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Loadout Card ────────────────────────────────────────────────────

function LoadoutCard({
  loadout,
  enemy,
  mode,
  enemies,
}: {
  loadout: LoadoutResult
  enemy: LoadoutResponse["enemy"]
  mode: Mode
  enemies: Enemy[]
}) {
  const fullEnemy = enemies.find((e) => e.id === enemy.id)

  return (
    <Card className="border-border/50">
      <CardContent className="space-y-4 pt-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-medium">Loadout #{loadout.rank}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              Score: {loadout.score}
            </Badge>
            {loadout.offense_score != null && (
              <Badge
                variant="outline"
                className="border-orange-500/50 bg-orange-600/20 text-[10px] text-orange-300"
              >
                ATK: {loadout.offense_score}
              </Badge>
            )}
            {loadout.defense_score != null && (
              <Badge
                variant="outline"
                className="border-blue-500/50 bg-blue-600/20 text-[10px] text-blue-300"
              >
                DEF: {loadout.defense_score}
              </Badge>
            )}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: Enemy info + stats panel */}
          <div className="space-y-3">
            <EnemyCard enemy={enemy} fullEnemy={fullEnemy} />
            <StatsPanel stats={loadout.stats} mode={mode} />
          </div>

          {/* Right: Recommended equipment + player stats */}
          <div className="space-y-3">
            <LoadoutEquipmentGridAdapter
              weapon={loadout.weapon}
              armorPieces={loadout.armor}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Enemy Card ──────────────────────────────────────────────────────

/** Affinity/damage keys we analyze for weaknesses and resistances */
const ELEMENT_KEYS = [
  { key: "air", label: "Air" },
  { key: "fire", label: "Fire" },
  { key: "earth", label: "Earth" },
  { key: "water", label: "Water" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
] as const

const DAMAGE_KEYS = [
  { key: "blunt", label: "Blunt" },
  { key: "edged", label: "Edged" },
  { key: "piercing", label: "Piercing" },
] as const

function EnemyCard({
  enemy,
  fullEnemy,
}: {
  enemy: LoadoutResponse["enemy"]
  fullEnemy?: Enemy
}) {
  // Fetch full enemy detail for body parts / weaknesses
  const { data: enemyDetail } = useQuery({
    queryKey: ["enemy", enemy.id],
    queryFn: () => gameApi.enemy(enemy.id),
  })

  const { weaknesses, resistances } = useMemo(() => {
    if (!enemyDetail?.body_parts?.length)
      return { weaknesses: [], resistances: [] }

    const parts = enemyDetail.body_parts
    const avg = (key: string) => {
      if (parts.length === 0) return 0
      return Math.round(
        parts.reduce(
          (sum, p) => sum + (p[key as keyof typeof p] as number),
          0
        ) / parts.length
      )
    }

    const all = [
      { label: "Physical", avg: avg("physical") },
      ...ELEMENT_KEYS.map((e) => ({ label: e.label, avg: avg(e.key) })),
      ...DAMAGE_KEYS.map((d) => ({ label: d.label, avg: avg(d.key) })),
    ]

    return {
      weaknesses: all.filter((a) => a.avg < 0).sort((a, b) => a.avg - b.avg),
      resistances: all.filter((a) => a.avg > 20).sort((a, b) => b.avg - a.avg),
    }
  }, [enemyDetail])

  return (
    <div className="bg-muted/30 space-y-3 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <ItemIcon type="Enemy" size="sm" />
        <span className="text-sm font-medium">{enemy.name}</span>
        <Badge variant="secondary" className="text-[10px]">
          {enemy.enemy_class}
        </Badge>
      </div>

      {/* Base stats */}
      <div className="flex flex-wrap gap-1.5">
        <StatBadge label="HP" value={enemy.hp} />
        <StatBadge label="MP" value={enemy.mp} />
        {fullEnemy && (
          <>
            <StatBadge label="STR" value={fullEnemy.str} />
            <StatBadge label="INT" value={fullEnemy.int} />
            <StatBadge label="AGL" value={fullEnemy.agi} />
            <StatBadge label="MOV" value={fullEnemy.movement} />
          </>
        )}
      </div>

      {/* Weaknesses & Resistances */}
      {(weaknesses.length > 0 || resistances.length > 0) && (
        <div className="flex flex-wrap gap-4">
          {weaknesses.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                Weak To
              </p>
              <div className="flex flex-wrap gap-1">
                {weaknesses.map((w) => (
                  <span
                    key={w.label}
                    className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-400"
                  >
                    {w.label} ({w.avg})
                  </span>
                ))}
              </div>
            </div>
          )}
          {resistances.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                Resistant To
              </p>
              <div className="flex flex-wrap gap-1">
                {resistances.map((r) => (
                  <span
                    key={r.label}
                    className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400"
                  >
                    {r.label} (+{r.avg})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Equipment Grid Adapter ──────────────────────────────────────────

function LoadoutEquipmentGridAdapter({
  weapon,
  armorPieces,
}: {
  weapon: LoadoutResult["weapon"]
  armorPieces: LoadoutResult["armor"]
}) {
  const slots = useMemo(() => {
    const map: Record<string, GridSlotData> = {}

    if (weapon) {
      map["right_hand"] = {
        name: weapon.blade_name,
        type: weapon.blade_type,
        material: weapon.material,
        damageType: weapon.damage_type,
        hands: weapon.hands,
        gripName: weapon.grip_name ?? undefined,
      }
    }

    const SLOT_TO_GRID: Record<string, string> = {
      helm: "head",
      head: "head",
      body: "body",
      arms: "arms",
      legs: "legs",
      shield: "left_hand",
      accessory: "accessory",
    }

    if (armorPieces) {
      for (const piece of armorPieces) {
        const slotKey = SLOT_TO_GRID[piece.slot] ?? piece.slot
        map[slotKey] = {
          name: piece.item_name,
          type: piece.armor_type,
          material: piece.material,
        }
      }
    }

    return map
  }, [weapon, armorPieces])

  return <EquipmentGridView slots={slots} />
}

// ── Stats Panel ─────────────────────────────────────────────────────

const MODE_LABELS: Record<Mode, { label: string; color: string }> = {
  full: {
    label: "Full",
    color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  offense: {
    label: "Offense",
    color: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  defense: {
    label: "Defense",
    color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
}

function StatsPanel({
  stats,
  mode,
}: {
  stats: LoadoutResult["stats"]
  mode: Mode
}) {
  const modeInfo = MODE_LABELS[mode]

  return (
    <div className="bg-muted/30 rounded-lg px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {stats.estimated_damage > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Est. Damage:</span>
            <span className="text-sm font-medium text-green-400">
              {stats.estimated_damage}
            </span>
          </div>
        )}

        {stats.target_body_part && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Target:</span>
            <span className="text-sm font-medium">
              {stats.target_body_part}
            </span>
            {stats.target_reason && (
              <span className="text-muted-foreground text-xs">
                — {stats.target_reason}
              </span>
            )}
          </div>
        )}

        <span
          className={cn(
            "ml-auto rounded border px-2 py-0.5 text-[10px] font-medium",
            modeInfo.color
          )}
        >
          {modeInfo.label}
        </span>
      </div>
    </div>
  )
}

// ── Utility ─────────────────────────────────────────────────────────

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 flex min-w-10 flex-col items-center rounded px-1.5 py-1">
      <span className="text-muted-foreground text-[10px] leading-none">
        {label}
      </span>
      <span className="text-foreground text-xs leading-tight font-medium">
        {value}
      </span>
    </div>
  )
}
