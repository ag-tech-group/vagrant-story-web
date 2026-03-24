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

function DiscoverResults({ results }: { results: CraftableResult[] }) {
  if (results.length === 0) {
    return (
      <div className="text-muted-foreground py-6 text-center text-sm">
        <FlaskConical className="mx-auto mb-2 size-8 opacity-30" />
        <p>No combinations found with your current inventory</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        {results.length} possible result{results.length !== 1 ? "s" : ""} — top
        results shown first
      </p>
      <div className="space-y-2">
        {results.slice(0, 20).map((r, i) => (
          <Card
            key={i}
            className={cn("transition-colors", i < 3 && "border-primary/30")}
          >
            <CardContent className="flex items-center gap-3 p-3">
              {i < 3 && (
                <span className="text-primary text-xs font-bold">#{i + 1}</span>
              )}
              <div className="flex items-center gap-2">
                <ItemIcon type={r.result.equipType} size="sm" />
                <span className="text-sm font-medium">{r.result.name}</span>
                {r.result.material && <MaterialBadge mat={r.result.material} />}
              </div>
              <ChevronRight className="text-muted-foreground size-3" />
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
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
              {r.step.recipe.tier_change > 0 && (
                <span className="text-primary ml-auto text-[10px] font-semibold">
                  UPGRADE
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
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
  const [expanded, setExpanded] = useState(rank === 1)

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors",
        rank === 1 && "border-primary/30"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground font-mono text-xs">
            #{rank}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{path.result.name}</span>
            {path.result.material && (
              <MaterialBadge mat={path.result.material} />
            )}
          </div>
          <span className="text-muted-foreground ml-auto text-xs">
            {path.steps.length} step{path.steps.length !== 1 ? "s" : ""}
          </span>
          <ChevronRight
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </div>

        {expanded && (
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

            <div className="text-muted-foreground pt-1 text-[11px]">
              Consumes:{" "}
              {path.consumedItems
                .filter((c) => c.sourceItem)
                .map((c) => `${c.name} (${c.material})`)
                .join(", ") || "intermediate results only"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
