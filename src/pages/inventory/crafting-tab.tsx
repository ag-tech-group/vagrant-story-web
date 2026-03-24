import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronRight,
  FlaskConical,
  Loader2,
  Search,
  Settings2,
  Undo2,
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
  type CraftingPath,
  type ReachableItem,
} from "@/lib/crafting-optimizer"
import type { WorkerRequest, WorkerResponse } from "@/lib/crafting-worker"
import { cn } from "@/lib/utils"

// ── Materials available per workshop ─────────────────────────────────

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

interface CraftingTabProps {
  items: InventoryItem[]
  blades: Blade[]
  armor: Armor[]
}

// ── Main component ───────────────────────────────────────────────────

export function CraftingTab({ items, blades, armor }: CraftingTabProps) {
  const [mode, setMode] = useState<Mode>("forward")
  const [workshopId, setWorkshopId] = useState<string>("6") // Godhands default
  const [includeEquipped, setIncludeEquipped] = useState(true)
  const [targetItem, setTargetItem] = useState<string | null>(null)
  const [targetMaterial, setTargetMaterial] = useState<string | null>(null)
  const [reverseSourceId, setReverseSourceId] = useState<number | null>(null)

  // Fetch workshops and recipes
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

  // Convert inventory to craftable items
  const craftables = useMemo(() => {
    const all = inventoryToCraftables(items, blades, armor)
    if (includeEquipped) return all
    return all.filter((c) => !c.sourceItem?.equip_slot)
  }, [items, blades, armor, includeEquipped])

  // ── Search state (declared before worker so refs can access them) ──

  const [forwardPaths, setForwardPaths] = useState<CraftingPath[]>([])
  const [forwardSearched, setForwardSearched] = useState(false)
  const [reverseResults, setReverseResults] = useState<ReachableItem[]>([])
  const [reverseSearched, setReverseSearched] = useState(false)

  // ── Web Worker ─────────────────────────────────────────────────────

  const workerRef = useRef<Worker | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const worker = new Worker(
      new URL("@/lib/crafting-worker.ts", import.meta.url),
      { type: "module" }
    )
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data
      setSearching(false)
      if (res.type === "forward" && res.forwardPaths) {
        setForwardPaths(res.forwardPaths)
        setForwardSearched(true)
      } else if (res.type === "reverse" && res.reverseResults) {
        setReverseResults(res.reverseResults)
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

  // ── Forward mode: picker items + search ────────────────────────────

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

  // Determine available materials for target
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

  // Forward search — triggered by button click, runs in worker
  const runForwardSearch = () => {
    if (!recipesReady || !targetItem) return
    setForwardSearched(false)
    postWorker({
      type: "forward",
      craftingRecipes,
      materialRecipes,
      craftables,
      targetName: targetItem,
      targetMaterial,
    })
  }

  // ── Reverse mode: source selection + search ────────────────────────

  const reverseSource = useMemo(
    () => craftables.find((c) => c.id === reverseSourceId) ?? null,
    [craftables, reverseSourceId]
  )

  const runReverseSearch = () => {
    if (!recipesReady || !reverseSource) return
    setReverseSearched(false)
    postWorker({
      type: "reverse",
      craftingRecipes,
      materialRecipes,
      craftables,
      sourceItem: reverseSource,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Workshop selector */}
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

        {/* Mode toggle */}
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
            Forward
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
            Reverse
          </button>
        </div>

        {/* Include equipped toggle */}
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

      {/* Forward mode */}
      {mode === "forward" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <ItemPicker
                items={allPickerItems}
                value={targetItem}
                onSelect={(name) => {
                  setTargetItem(name)
                  setTargetMaterial(null)
                  setForwardSearched(false)
                }}
                placeholder="Select target item..."
                label="Target"
              />
            </div>
            {targetItem && targetMaterials.length > 0 && (
              <div className="min-w-[10rem]">
                <MaterialSelect
                  materials={targetMaterials}
                  value={targetMaterial}
                  onSelect={(m) => {
                    setTargetMaterial(m)
                    setForwardSearched(false)
                  }}
                  label="Material (optional)"
                />
              </div>
            )}
            {targetItem && recipesReady && (
              <Button onClick={runForwardSearch} size="sm" disabled={searching}>
                {searching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                {searching ? "Searching..." : "Find Paths"}
              </Button>
            )}
          </div>

          {/* Results */}
          {forwardSearched && (
            <ForwardResults
              paths={forwardPaths}
              targetName={targetItem ?? ""}
              targetMaterial={targetMaterial}
            />
          )}
        </div>
      )}

      {/* Reverse mode */}
      {mode === "reverse" && (
        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              Select an item from your inventory
            </label>
            <div className="flex flex-wrap gap-2">
              {craftables.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setReverseSourceId(c.id)
                    setReverseSearched(false)
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                    reverseSourceId === c.id
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-foreground/30"
                  )}
                >
                  <ItemIcon type={c.equipType} size="sm" />
                  <span className="font-medium">{c.name}</span>
                  {c.material && <MaterialBadge mat={c.material} />}
                </button>
              ))}
            </div>
          </div>

          {reverseSource && recipesReady && (
            <Button onClick={runReverseSearch} size="sm" disabled={searching}>
              {searching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              {searching ? "Searching..." : "Find Craftable Items"}
            </Button>
          )}

          {reverseSearched && reverseSource && (
            <ReverseResults
              results={reverseResults}
              sourceName={reverseSource.name}
            />
          )}
        </div>
      )}

      {/* Empty state */}
      {!recipesReady && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Loading crafting recipes...
        </p>
      )}
    </div>
  )
}

// ── Forward results ──────────────────────────────────────────────────

function ForwardResults({
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
        {/* Header */}
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

        {/* Steps */}
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

            {/* Consumed items summary */}
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

// ── Reverse results ──────────────────────────────────────────────────

function ReverseResults({
  results,
  sourceName,
}: {
  results: ReachableItem[]
  sourceName: string
}) {
  if (results.length === 0) {
    return (
      <div className="text-muted-foreground py-6 text-center text-sm">
        <Undo2 className="mx-auto mb-2 size-8 opacity-30" />
        <p>
          No crafting options found for{" "}
          <span className="font-medium">{sourceName}</span>
        </p>
        <p className="mt-1 text-xs">
          This item can't be combined with anything in your current inventory
        </p>
      </div>
    )
  }

  // Group by depth
  const byDepth = new Map<number, ReachableItem[]>()
  for (const r of results) {
    const list = byDepth.get(r.depth) ?? []
    list.push(r)
    byDepth.set(r.depth, list)
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        {results.length} reachable item{results.length !== 1 ? "s" : ""} from{" "}
        <span className="font-medium">{sourceName}</span>
      </p>

      {[...byDepth.entries()].map(([depth, items]) => (
        <div key={depth}>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            {depth} step{depth !== 1 ? "s" : ""}
          </p>
          <div className="space-y-1">
            {items.map((r, i) => (
              <div
                key={i}
                className="border-border/50 flex items-center gap-2 rounded-lg border px-3 py-2"
              >
                <ItemIcon type={r.item.equipType} size="sm" />
                <span className="text-sm font-medium">{r.item.name}</span>
                {r.item.material && <MaterialBadge mat={r.item.material} />}
                <span className="text-muted-foreground ml-auto text-xs">
                  {r.path
                    .map(
                      (s) =>
                        `${s.input1.name} + ${s.input2.name} → ${s.result.name}`
                    )
                    .join(" → ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
