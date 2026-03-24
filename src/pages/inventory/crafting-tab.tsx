import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronRight,
  FlaskConical,
  Loader2,
  Search,
  Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ItemIcon } from "@/components/item-icon"
import { MaterialBadge } from "@/components/stat-display"
import { ItemPicker, type PickerItem } from "@/components/item-picker"
import { MaterialSelect } from "@/components/material-select"
import { gameApi, type Armor, type Blade } from "@/lib/game-api"
import type { InventoryItem } from "@/lib/inventory-api"
import {
  inventoryToCraftables,
  type CraftableResult,
  type CraftingPath,
} from "@/lib/crafting-optimizer"
import type { WorkerRequest, WorkerResponse } from "@/lib/crafting-worker"
import { cn } from "@/lib/utils"

// ── Materials ────────────────────────────────────────────────────────

const BLADE_MATS = ["Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const ALL_MATERIALS = [
  "Wood",
  "Leather",
  "Bronze",
  "Iron",
  "Hagane",
  "Silver",
  "Damascus",
]

// ── Types ────────────────────────────────────────────────────────────

type Mode = "forward" | "reverse"
type Category = "blade" | "shield" | "armor"

interface CraftingTabProps {
  items: InventoryItem[]
  blades: Blade[]
  armor: Armor[]
}

// ── Main component ───────────────────────────────────────────────────

export function CraftingTab({ items, blades, armor }: CraftingTabProps) {
  const [mode, setMode] = useState<Mode>("forward")
  const [workshopId, setWorkshopId] = useState<string>("6")
  const [includeEquipped, setIncludeEquipped] = useState(true)
  const [forwardCategory, setForwardCategory] = useState<Category>("blade")
  const [searchDepth, setSearchDepth] = useState<number>(1)

  // Reverse mode state
  const [targetItem, setTargetItem] = useState<string | null>(null)
  const [targetMaterial, setTargetMaterial] = useState<string | null>(null)

  // Fetch data
  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops"],
    queryFn: gameApi.workshops,
  })
  const { data: craftingRecipes = [] } = useQuery({
    queryKey: ["craftingRecipes"],
    queryFn: () => gameApi.craftingRecipes("limit=10000"),
  })
  const { data: materialRecipes = [] } = useQuery({
    queryKey: ["materialRecipes"],
    queryFn: () => gameApi.materialRecipes("limit=10000"),
  })

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })

  const recipesReady = craftingRecipes.length > 0 && materialRecipes.length > 0

  const craftables = useMemo(() => {
    const all = inventoryToCraftables(items, blades, armor)
    if (includeEquipped) return all
    return all.filter((c) => !c.sourceItem?.equip_slot)
  }, [items, blades, armor, includeEquipped])

  // ── Search state ───────────────────────────────────────────────────

  const [discoverResults, setDiscoverResults] = useState<CraftableResult[]>([])
  const [discoverSearched, setDiscoverSearched] = useState(false)
  const [reversePaths, setReversePaths] = useState<CraftingPath[]>([])
  const [reverseSearched, setReverseSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  // ── Web Worker ─────────────────────────────────────────────────────

  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL("@/lib/crafting-worker.ts", import.meta.url),
      { type: "module" }
    )
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data
      setSearching(false)
      if (res.type === "discover" && res.discoverResults) {
        setDiscoverResults(res.discoverResults)
        setDiscoverSearched(true)
      } else if (res.type === "reverse" && res.reversePaths) {
        setReversePaths(res.reversePaths)
        setReverseSearched(true)
      }
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const postWorker = useCallback((req: WorkerRequest) => {
    if (!workerRef.current) return
    setSearching(true)
    workerRef.current.postMessage(req)
  }, [])

  // ── Forward: discover what you can make ────────────────────────────

  const runDiscover = () => {
    if (!recipesReady) return
    setDiscoverSearched(false)
    const filtered = craftables.filter((c) => c.category === forwardCategory)
    const filteredRecipes = craftingRecipes.filter(
      (r) => r.category === forwardCategory
    )
    postWorker({
      type: "discover",
      craftingRecipes: filteredRecipes,
      materialRecipes,
      craftables: filtered,
      blades,
      armor,
      materials,
      maxDepth: searchDepth,
    })
  }

  // ── Reverse: find path to a target ─────────────────────────────────

  const bladePickerItems: PickerItem[] = useMemo(
    () =>
      blades.map((b) => ({
        name: b.name,
        type: b.blade_type,
        level: b.game_id,
        suffix: b.hands,
      })),
    [blades]
  )

  const armorPickerItems: PickerItem[] = useMemo(
    () =>
      armor.map((a) => ({
        name: a.name,
        type: a.armor_type,
        level: a.game_id,
      })),
    [armor]
  )

  const allPickerItems = useMemo(
    () => [...bladePickerItems, ...armorPickerItems],
    [bladePickerItems, armorPickerItems]
  )

  const targetMaterials = useMemo(() => {
    if (!targetItem) return []
    const blade = blades.find((b) => b.name === targetItem)
    if (blade) return BLADE_MATS
    const a = armor.find((ar) => ar.name === targetItem)
    if (a?.armor_type === "Shield")
      return ["Wood", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
    if (a?.armor_type === "Accessory") return []
    if (a) return ["Leather", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
    return ALL_MATERIALS
  }, [targetItem, blades, armor])

  const runReverse = () => {
    if (!recipesReady || !targetItem) return
    setReverseSearched(false)

    const blade = blades.find((b) => b.name === targetItem)
    const armorItem = armor.find((a) => a.name === targetItem)
    const targetCategory = blade
      ? "blade"
      : armorItem?.armor_type === "Shield"
        ? "shield"
        : "armor"

    const filtered = craftables.filter((c) => c.category === targetCategory)
    const filteredRecipes = craftingRecipes.filter(
      (r) => r.category === targetCategory
    )

    postWorker({
      type: "reverse",
      craftingRecipes: filteredRecipes,
      materialRecipes,
      craftables: filtered,
      targetName: targetItem,
      targetMaterial,
      maxDepth: searchDepth,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={workshopId} onValueChange={setWorkshopId}>
          <SelectTrigger className="h-9 w-auto min-w-[12rem]">
            <Settings2 className="mr-1.5 size-3.5" />
            <SelectValue placeholder="Workshop" />
          </SelectTrigger>
          <SelectContent>
            {workshops.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                <div>
                  <div className="font-medium">{w.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {w.available_materials}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border">
          <button
            type="button"
            onClick={() => setMode("forward")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "forward"
                ? "bg-primary text-primary-foreground rounded-l-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            What Can I Make?
          </button>
          <button
            type="button"
            onClick={() => setMode("reverse")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "reverse"
                ? "bg-primary text-primary-foreground rounded-r-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            How Do I Make...?
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={includeEquipped}
            onChange={(e) => setIncludeEquipped(e.target.checked)}
            className="accent-primary size-3.5"
          />
          <span className="text-muted-foreground">Include equipped</span>
        </label>

        <Select
          value={String(searchDepth)}
          onValueChange={(v) => setSearchDepth(Number(v))}
        >
          <SelectTrigger className="h-9 w-auto min-w-[6rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 step</SelectItem>
            <SelectItem value="2">2 steps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Forward: What Can I Make? */}
      {mode === "forward" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select
              value={forwardCategory}
              onValueChange={(v) => {
                setForwardCategory(v as Category)
                setDiscoverSearched(false)
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-[8rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blade">Blades</SelectItem>
                <SelectItem value="shield">Shields</SelectItem>
                <SelectItem value="armor">Armor</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={runDiscover}
              size="sm"
              disabled={searching || !recipesReady}
            >
              {searching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              {searching ? "Searching..." : "Find Best Results"}
            </Button>
            <span className="text-muted-foreground text-xs">
              {craftables.filter((c) => c.category === forwardCategory).length}{" "}
              items in inventory
            </span>
          </div>

          {discoverSearched && <DiscoverResults results={discoverResults} />}
        </div>
      )}

      {/* Reverse: How Do I Make...? */}
      {mode === "reverse" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <ItemPicker
                items={allPickerItems}
                value={targetItem}
                onSelect={(name) => {
                  setTargetItem(name)
                  setTargetMaterial(null)
                  setReverseSearched(false)
                }}
                placeholder="Select target item..."
                label="I want to make..."
              />
            </div>
            {targetItem && targetMaterials.length > 0 && (
              <div className="min-w-[10rem]">
                <MaterialSelect
                  materials={targetMaterials}
                  value={targetMaterial}
                  onSelect={(m) => {
                    setTargetMaterial(m)
                    setReverseSearched(false)
                  }}
                  label="Material (optional)"
                />
              </div>
            )}
            {targetItem && recipesReady && (
              <Button onClick={runReverse} size="sm" disabled={searching}>
                {searching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                {searching ? "Searching..." : "Find Paths"}
              </Button>
            )}
          </div>

          {reverseSearched && (
            <ReverseResults
              paths={reversePaths}
              targetName={targetItem ?? ""}
              targetMaterial={targetMaterial}
            />
          )}
        </div>
      )}

      {!recipesReady && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Loading crafting recipes...
        </p>
      )}
    </div>
  )
}

// ── Discover results (forward) ───────────────────────────────────────

type DiscoverSort = "score" | "material" | "stats" | "steps"
type DiscoverFilter = "all" | "mat-upgrade" | "tier-up" | "stat-up"

const MATERIAL_ORDER: Record<string, number> = {
  Wood: 0,
  Leather: 1,
  Bronze: 2,
  Iron: 3,
  Hagane: 4,
  Silver: 5,
  Damascus: 6,
}

function DiscoverResults({ results }: { results: CraftableResult[] }) {
  const [showAll, setShowAll] = useState(false)
  const [sortBy, setSortBy] = useState<DiscoverSort>("score")
  const [filterBy, setFilterBy] = useState<DiscoverFilter>("all")
  const PAGE_SIZE = 20

  // Only show results that are upgrades (material or tier or stat improvement)
  const upgrades = useMemo(() => {
    let filtered = results.filter(
      (r) =>
        r.materialUpgrade ||
        r.step.recipe.tier_change > 0 ||
        (r.statDiff && r.statDiff.total > 0)
    )

    // Apply user filter
    if (filterBy === "mat-upgrade") {
      filtered = filtered.filter((r) => r.materialUpgrade)
    } else if (filterBy === "tier-up") {
      filtered = filtered.filter((r) => r.step.recipe.tier_change > 0)
    } else if (filterBy === "stat-up") {
      filtered = filtered.filter((r) => r.statDiff && r.statDiff.total > 0)
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      if (sortBy === "material") {
        return (
          (MATERIAL_ORDER[b.result.material] ?? 0) -
          (MATERIAL_ORDER[a.result.material] ?? 0)
        )
      }
      if (sortBy === "stats") {
        return (b.statDiff?.total ?? 0) - (a.statDiff?.total ?? 0)
      }
      if (sortBy === "steps") {
        return a.steps - b.steps
      }
      return b.score - a.score
    })
  }, [results, sortBy, filterBy])

  if (upgrades.length === 0) {
    return (
      <div className="text-muted-foreground py-6 text-center text-sm">
        <FlaskConical className="mx-auto mb-2 size-8 opacity-30" />
        <p>No upgrades found with your current inventory</p>
        <p className="mt-1 text-xs">
          {results.length > 0
            ? `${results.length} combinations exist but none match the filter`
            : "No combinations found"}
        </p>
      </div>
    )
  }

  const visible = showAll ? upgrades : upgrades.slice(0, PAGE_SIZE)
  const hasMore = upgrades.length > PAGE_SIZE && !showAll

  return (
    <div className="space-y-3">
      {/* Sort + filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as DiscoverSort)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[7rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Best Overall</SelectItem>
            <SelectItem value="material">Material Tier</SelectItem>
            <SelectItem value="stats">Stat Gain</SelectItem>
            <SelectItem value="steps">Fewest Steps</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterBy}
          onValueChange={(v) => setFilterBy(v as DiscoverFilter)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[7rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Upgrades</SelectItem>
            <SelectItem value="mat-upgrade">Material Upgrades</SelectItem>
            <SelectItem value="tier-up">Tier Up Only</SelectItem>
            <SelectItem value="stat-up">Stat Gains Only</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">
          {upgrades.length} result{upgrades.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((r, i) => (
          <DiscoverCard key={i} result={r} />
        ))}
      </div>
      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full"
        >
          Show all {upgrades.length} results
        </Button>
      )}
    </div>
  )
}

function DiscoverCard({ result: r }: { result: CraftableResult }) {
  const [expanded, setExpanded] = useState(false)
  const isMultiStep = r.steps > 1

  return (
    <Card
      className={cn("transition-colors", isMultiStep && "cursor-pointer")}
      onClick={isMultiStep ? () => setExpanded(!expanded) : undefined}
    >
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Result */}
          <div className="flex items-center gap-2">
            <ItemIcon type={r.result.equipType} size="sm" />
            <span className="text-sm font-medium">{r.result.name}</span>
            {r.result.material && <MaterialBadge mat={r.result.material} />}
          </div>

          {/* Badges */}
          {r.materialUpgrade && (
            <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">
              MAT UPGRADE
            </span>
          )}
          {r.step.recipe.tier_change > 0 && (
            <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold">
              TIER UP
            </span>
          )}
          {isMultiStep && (
            <span className="text-muted-foreground text-[10px]">
              {r.steps} steps
            </span>
          )}

          {/* Stat diff */}
          {r.statDiff && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium">
              {r.statDiff.str !== 0 && (
                <span
                  className={
                    r.statDiff.str > 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  STR {r.statDiff.str > 0 ? "+" : ""}
                  {r.statDiff.str}
                </span>
              )}
              {r.statDiff.int !== 0 && (
                <span
                  className={
                    r.statDiff.int > 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  INT {r.statDiff.int > 0 ? "+" : ""}
                  {r.statDiff.int}
                </span>
              )}
              {r.statDiff.agi !== 0 && (
                <span
                  className={
                    r.statDiff.agi > 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  AGI {r.statDiff.agi > 0 ? "+" : ""}
                  {r.statDiff.agi}
                </span>
              )}
            </div>
          )}

          {/* Recipe (last step for 1-step, or summary) */}
          <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            <span>{r.step.input1.name}</span>
            {r.step.input1.material && (
              <MaterialBadge mat={r.step.input1.material} />
            )}
            <span>+</span>
            <span>{r.step.input2.name}</span>
            {r.step.input2.material && (
              <MaterialBadge mat={r.step.input2.material} />
            )}
          </div>

          {isMultiStep && (
            <ChevronRight
              className={cn(
                "text-muted-foreground size-4 transition-transform",
                expanded && "rotate-90"
              )}
            />
          )}
        </div>

        {/* Expanded steps */}
        {expanded && isMultiStep && (
          <div className="mt-3 space-y-2">
            {r.path.map((step, i) => (
              <div
                key={i}
                className="bg-muted/30 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground font-mono">
                  {i + 1}.
                </span>
                <div className="flex items-center gap-1">
                  <ItemIcon type={step.input1.equipType} size="sm" />
                  <span className="font-medium">{step.input1.name}</span>
                  {step.input1.material && (
                    <MaterialBadge mat={step.input1.material} />
                  )}
                </div>
                <span className="text-muted-foreground">+</span>
                <div className="flex items-center gap-1">
                  <ItemIcon type={step.input2.equipType} size="sm" />
                  <span className="font-medium">{step.input2.name}</span>
                  {step.input2.material && (
                    <MaterialBadge mat={step.input2.material} />
                  )}
                </div>
                <ChevronRight className="text-muted-foreground size-3" />
                <div className="flex items-center gap-1">
                  <span className="text-primary font-medium">
                    {step.result.name}
                  </span>
                  {step.result.material && (
                    <MaterialBadge mat={step.result.material} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Reverse results (find path to target) ────────────────────────────

function ReverseResults({
  paths,
  targetName,
  targetMaterial,
}: {
  paths: CraftingPath[]
  targetName: string
  targetMaterial: string | null
}) {
  if (paths.length === 0) {
    return (
      <div className="text-muted-foreground py-6 text-center text-sm">
        <FlaskConical className="mx-auto mb-2 size-8 opacity-30" />
        <p>
          No crafting paths found for{" "}
          <span className="font-medium">{targetName}</span>
          {targetMaterial && (
            <>
              {" "}
              in <span className="font-medium">{targetMaterial}</span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs">
          Try a different material, or check that your inventory has compatible
          items
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        {paths.length} path{paths.length !== 1 ? "s" : ""} found
      </p>
      {paths.map((path, i) => (
        <PathCard key={i} path={path} rank={i + 1} />
      ))}
    </div>
  )
}

function PathCard({ path, rank }: { path: CraftingPath; rank: number }) {
  const isMultiStep = path.steps.length > 1
  const [expanded, setExpanded] = useState(rank === 1 && isMultiStep)

  // 1-step: show inline recipe. Multi-step: collapsible.
  return (
    <Card
      className={cn(
        "transition-colors",
        isMultiStep && "cursor-pointer",
        rank === 1 && "border-primary/30"
      )}
      onClick={isMultiStep ? () => setExpanded(!expanded) : undefined}
    >
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <ItemIcon type={path.result.equipType} size="sm" />
            <span className="text-sm font-medium">{path.result.name}</span>
            {path.result.material && (
              <MaterialBadge mat={path.result.material} />
            )}
          </div>
          {isMultiStep && (
            <span className="text-muted-foreground text-[10px]">
              {path.steps.length} steps
            </span>
          )}

          {/* Inline recipe for 1-step */}
          <div className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            {!isMultiStep && path.steps[0] && (
              <>
                <span>{path.steps[0].input1.name}</span>
                {path.steps[0].input1.material && (
                  <MaterialBadge mat={path.steps[0].input1.material} />
                )}
                <span>+</span>
                <span>{path.steps[0].input2.name}</span>
                {path.steps[0].input2.material && (
                  <MaterialBadge mat={path.steps[0].input2.material} />
                )}
              </>
            )}
          </div>

          {isMultiStep && (
            <ChevronRight
              className={cn(
                "text-muted-foreground size-4 transition-transform",
                expanded && "rotate-90"
              )}
            />
          )}
        </div>

        {expanded && isMultiStep && (
          <div className="mt-3 space-y-2">
            {path.steps.map((step, i) => (
              <div
                key={i}
                className="bg-muted/30 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground font-mono">
                  {i + 1}.
                </span>
                <div className="flex items-center gap-1">
                  <ItemIcon type={step.input1.equipType} size="sm" />
                  <span className="font-medium">{step.input1.name}</span>
                  {step.input1.material && (
                    <MaterialBadge mat={step.input1.material} />
                  )}
                </div>
                <span className="text-muted-foreground">+</span>
                <div className="flex items-center gap-1">
                  <ItemIcon type={step.input2.equipType} size="sm" />
                  <span className="font-medium">{step.input2.name}</span>
                  {step.input2.material && (
                    <MaterialBadge mat={step.input2.material} />
                  )}
                </div>
                <ChevronRight className="text-muted-foreground size-3" />
                <div className="flex items-center gap-1">
                  <span className="text-primary font-medium">
                    {step.result.name}
                  </span>
                  {step.result.material && (
                    <MaterialBadge mat={step.result.material} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
