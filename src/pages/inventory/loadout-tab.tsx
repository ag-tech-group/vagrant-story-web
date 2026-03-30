import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Info, Loader2, RotateCcw, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  type LoadoutRequest,
  type LoadoutResponse,
  type LoadoutResult,
} from "@/lib/inventory-api"
import { cn } from "@/lib/utils"

// ── Slot display order ──────────────────────────────────────────────

// ── Types ───────────────────────────────────────────────────────────

type Mode = "full" | "offense" | "defense"

interface BaseStats {
  hp: number
  mp: number
  str: number
  int: number
  agi: number
}

interface LoadoutTabProps {
  items: InventoryItem[]
  inventoryId: number
  baseStats?: BaseStats
}

// ── Main component ──────────────────────────────────────────────────

export function LoadoutTab({ items, inventoryId, baseStats }: LoadoutTabProps) {
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("full")
  const [includeEquipped, setIncludeEquipped] = useState(true)
  const [includeBag, setIncludeBag] = useState(true)
  const [includeContainer, setIncludeContainer] = useState(true)
  const [include2H, setInclude2H] = useState(true)
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
    mutationFn: (req: LoadoutRequest) => loadoutApi.optimize(req),
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
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={include2H}
                onChange={(e) => setInclude2H(e.target.checked)}
                className="accent-primary size-3.5"
              />
              <span className="text-muted-foreground">2H Weapons</span>
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
            onClick={() => {
              if (!selectedEnemyObj) return
              analyzeMutation.mutate({
                inventory_id: inventoryId,
                enemy_id: selectedEnemyObj.id,
                mode,
                include_equipped: includeEquipped,
                include_bag: includeBag,
                include_container: includeContainer,
                include_2h: include2H,
              })
            }}
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
            result.loadouts.map((loadout, i) => (
              <LoadoutCard
                key={loadout.rank}
                loadout={loadout}
                previousLoadout={i > 0 ? result.loadouts[i - 1] : undefined}
                enemy={result.enemy}
                mode={mode}
                enemies={enemies}
                baseStats={baseStats}
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
  previousLoadout,
  enemy,
  mode,
  enemies,
  baseStats,
}: {
  loadout: LoadoutResult
  previousLoadout?: LoadoutResult
  enemy: LoadoutResponse["enemy"]
  mode: Mode
  enemies: Enemy[]
  baseStats?: BaseStats
}) {
  const fullEnemy = enemies.find((e) => e.id === enemy.id)

  // Compute which slots differ from the previous loadout
  const diffSlots = useMemo(() => {
    if (!previousLoadout) return new Set<string>()
    const diffs = new Set<string>()

    // Compare weapon
    if (
      loadout.weapon?.blade_name !== previousLoadout.weapon?.blade_name ||
      loadout.weapon?.material !== previousLoadout.weapon?.material ||
      loadout.weapon?.grip_name !== previousLoadout.weapon?.grip_name
    ) {
      diffs.add("right_hand")
    }

    // Compare armor pieces
    const prevArmorMap = new Map(
      (previousLoadout.armor ?? []).map((a) => [a.slot, a])
    )
    for (const piece of loadout.armor ?? []) {
      const prev = prevArmorMap.get(piece.slot)
      if (
        !prev ||
        prev.item_name !== piece.item_name ||
        prev.material !== piece.material
      ) {
        const slotKey =
          piece.slot === "helm"
            ? "head"
            : piece.slot === "shield"
              ? "left_hand"
              : piece.slot
        diffs.add(slotKey)
      }
    }

    return diffs
  }, [loadout, previousLoadout])

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
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground cursor-help">
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72 text-xs leading-relaxed">
                <p className="font-semibold">How scores are calculated</p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Score</span> is the
                  weighted combination of ATK and DEF used to rank loadouts.
                </p>
                <p className="mt-1">
                  <span className="text-orange-300">ATK</span> rates weapon
                  effectiveness: base damage + damage type vs body part defenses
                  + class/elemental affinity matchups − evade difficulty.
                  Negative values mean the enemy strongly resists this weapon.
                </p>
                <p className="mt-1">
                  <span className="text-blue-300">DEF</span> rates armor
                  coverage: damage type resistances + class/elemental affinities
                  from armor and materials vs the enemy's attacks.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Three-column layout */}
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          {/* Left: Enemy info + stats panel */}
          <div className="space-y-3">
            <EnemyCard enemy={enemy} fullEnemy={fullEnemy} />
            <StatsPanel stats={loadout.stats} mode={mode} />
          </div>

          {/* Center: Recommended equipment */}
          <LoadoutEquipmentGridAdapter
            weapon={loadout.weapon}
            armorPieces={loadout.armor}
            highlightSlots={diffSlots}
          />

          {/* Right: Player combined stats */}
          <CombinedStatsPanel
            stats={loadout.combined_stats}
            baseStats={baseStats}
          />
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
  highlightSlots,
}: {
  weapon: LoadoutResult["weapon"]
  armorPieces: LoadoutResult["armor"]
  highlightSlots?: Set<string>
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

  return <EquipmentGridView slots={slots} highlightSlots={highlightSlots} />
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
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Est. Damage:</span>
          <span
            className={cn(
              "text-sm font-medium",
              stats.estimated_damage > 0
                ? "text-green-400"
                : "text-muted-foreground"
            )}
          >
            {stats.estimated_damage}
          </span>
        </div>

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

// ── Combined Stats Panel ─────────────────────────────────────────────

const EMPTY_COMBINED_STATS: import("@/lib/inventory-api").LoadoutCombinedStats =
  {
    str: 0,
    int: 0,
    agi: 0,
    range: 0,
    risk: 0,
    damage_type: "",
    blunt: 0,
    edged: 0,
    piercing: 0,
    human: 0,
    beast: 0,
    undead: 0,
    phantom: 0,
    dragon: 0,
    evil: 0,
    physical: 0,
    fire: 0,
    water: 0,
    wind: 0,
    earth: 0,
    light: 0,
    dark: 0,
  }

function CombinedStatsPanel({
  stats: rawStats,
  baseStats,
}: {
  stats: import("@/lib/inventory-api").LoadoutCombinedStats | null
  baseStats?: BaseStats
}) {
  const stats = rawStats ?? EMPTY_COMBINED_STATS
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {baseStats ? "Combined Stats" : "Loadout Stats"}
      </p>
      {!baseStats && (
        <p className="text-muted-foreground/60 text-[9px]">
          Equipment contribution only
        </p>
      )}
      <div className="grid grid-cols-3 gap-1">
        {baseStats ? (
          <>
            <StatBadge
              label="STR"
              value={baseStats.str + stats.str}
              diff={stats.str}
            />
            <StatBadge
              label="INT"
              value={baseStats.int + stats.int}
              diff={stats.int}
            />
            <StatBadge
              label="AGI"
              value={baseStats.agi + stats.agi}
              diff={stats.agi}
            />
          </>
        ) : (
          <>
            <StatBadge label="STR" value={stats.str} />
            <StatBadge label="INT" value={stats.int} />
            <StatBadge label="AGI" value={stats.agi} />
          </>
        )}
        {stats.range > 0 && <StatBadge label="RNG" value={stats.range} />}
        {stats.risk > 0 && <StatBadge label="RSK" value={stats.risk} />}
      </div>
      {baseStats && (
        <p className="text-muted-foreground/60 text-[9px]">
          Base + equipment modifier
        </p>
      )}
      <div className="grid grid-cols-3 gap-1">
        <StatBadge label="Blt" value={stats.blunt} />
        <StatBadge label="Edg" value={stats.edged} />
        <StatBadge label="Prc" value={stats.piercing} />
      </div>
      <p className="text-muted-foreground text-[9px] font-medium tracking-wider uppercase">
        Affinities
      </p>
      <div className="grid grid-cols-3 gap-1">
        <StatBadge label="Hum" value={stats.human} />
        <StatBadge label="Bst" value={stats.beast} />
        <StatBadge label="Und" value={stats.undead} />
        <StatBadge label="Phm" value={stats.phantom} />
        <StatBadge label="Drg" value={stats.dragon} />
        <StatBadge label="Evl" value={stats.evil} />
      </div>
      <div className="grid grid-cols-3 gap-1">
        <StatBadge label="Phy" value={stats.physical} />
        <StatBadge label="Fir" value={stats.fire} />
        <StatBadge label="Wat" value={stats.water} />
        <StatBadge label="Wnd" value={stats.wind} />
        <StatBadge label="Ear" value={stats.earth} />
        <StatBadge label="Lit" value={stats.light} />
        <StatBadge label="Drk" value={stats.dark} />
      </div>
    </div>
  )
}

// ── Utility ─────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  diff,
}: {
  label: string
  value: number
  diff?: number
}) {
  return (
    <div className="bg-muted/50 flex min-w-10 flex-col items-center rounded px-1.5 py-1">
      <span className="text-muted-foreground text-[10px] leading-none">
        {label}
      </span>
      <span
        className={cn(
          "text-xs leading-tight font-medium",
          value > 0 && "text-green-400",
          value < 0 && "text-red-400",
          value === 0 && "text-muted-foreground"
        )}
      >
        {value}
      </span>
      {diff != null && diff !== 0 && (
        <span
          className={cn(
            "text-[10px] leading-none font-medium",
            diff > 0 ? "text-green-400/70" : "text-red-400/70"
          )}
        >
          ({diff > 0 ? `+${diff}` : diff})
        </span>
      )}
    </div>
  )
}
