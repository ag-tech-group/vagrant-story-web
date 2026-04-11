import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  FlaskConical,
  Loader2,
  RotateCcw,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ItemIcon } from "@/components/item-icon"
import { DamageTypeBadge, MaterialBadge } from "@/components/stat-display"
import { ItemPicker, type PickerItem } from "@/components/item-picker"
import { MaterialSelect } from "@/components/material-select"
import { gameApi, type Armor, type Blade } from "@/lib/game-api"
import type { InventoryItem } from "@/lib/inventory-api"
import {
  inventoryToCraftables,
  type CraftableResult,
  type CraftingPath,
  type CraftingStep,
  type DecompNode,
} from "@/lib/crafting-optimizer"
import type { WorkerRequest, WorkerResponse } from "@/lib/crafting-worker"
import { cn } from "@/lib/utils"

// ── Constants ─────────────────────────────────────────────────────────

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

const BLADE_HANDS: Record<string, string> = {
  Dagger: "1H",
  Sword: "1H",
  "Axe / Mace": "1H",
  "Great Sword": "2H",
  "Great Axe": "2H",
  Staff: "2H",
  "Heavy Mace": "2H",
  Polearm: "2H",
  Crossbow: "2H",
}

// ── Types ─────────────────────────────────────────────────────────────

type Category = "blade" | "shield" | "armor"

/** Unified row for both forward and reverse results */
interface ResultRow {
  key: string
  resultName: string
  resultMaterial: string
  resultEquipType: string
  resultDamageType?: string
  resultHands?: string
  statDiff: { str: number; int: number; agi: number; total: number } | null
  steps: number
  slot1Name: string
  slot1Material: string
  slot1EquipType: string
  slot1DamageType?: string
  slot1Hands?: string
  slot2Name: string
  slot2Material: string
  slot2EquipType: string
  slot2DamageType?: string
  slot2Hands?: string
  workshops: { id: number; name: string }[]
  /** Full path for step tree detail */
  path: CraftingStep[]
  /** For reverse mode: decomp tree if available */
  decompTree?: DecompNode
  /** Source data for badges */
  materialUpgrade: boolean
  tierChange: number
}

interface CraftingTabProps {
  items: InventoryItem[]
  blades: Blade[]
  armor: Armor[]
  searchParams: {
    wcat?: string
    target?: string
    tmat?: string
    depth?: number
  }
  updateSearch: (updates: Record<string, string | number | undefined>) => void
}

// ── Main component ────────────────────────────────────────────────────

export function CraftingTab({
  items,
  blades,
  armor,
  searchParams,
  updateSearch,
}: CraftingTabProps) {
  // Controls — backed by URL search params
  const forwardCategory = (searchParams.wcat as Category) ?? null
  const setForwardCategory = (v: Category | null) =>
    updateSearch({ wcat: v ?? undefined, target: undefined, tmat: undefined })
  const targetItem = searchParams.target ?? null
  const setTargetItem = (v: string | null) =>
    updateSearch({ target: v ?? undefined, wcat: undefined })
  const targetMaterial = searchParams.tmat ?? null
  const setTargetMaterial = (v: string | null) =>
    updateSearch({ tmat: v ?? undefined })
  const searchDepth = searchParams.depth ?? 1
  const setSearchDepth = (v: number) =>
    updateSearch({ depth: v === 1 ? undefined : v })
  const [includeEquipped, setIncludeEquipped] = useState(true)
  const [includeBag, setIncludeBag] = useState(true)
  const [includeContainer, setIncludeContainer] = useState(true)

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

  const mode: "forward" | "reverse" | null = forwardCategory
    ? "forward"
    : targetItem
      ? "reverse"
      : null

  // Filter inventory items based on checkboxes
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (item.equip_slot && !includeEquipped) return false
      if (item.storage === "bag" && !includeBag) return false
      if (item.storage === "container" && !includeContainer) return false
      return true
    })
  }, [items, includeEquipped, includeBag, includeContainer])

  const craftables = useMemo(
    () => inventoryToCraftables(filteredItems, blades, armor),
    [filteredItems, blades, armor]
  )

  // Build blade info maps for displaying damage type + hands
  const bladeDamageMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of blades) map.set(b.name, b.damage_type)
    return map
  }, [blades])

  const bladeHandsMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of blades) {
      const h = BLADE_HANDS[b.blade_type]
      if (h) map.set(b.name, h)
    }
    return map
  }, [blades])

  // Build ID lookup maps for linking to detail pages
  const bladeIdMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of blades) map.set(b.name, b.id)
    return map
  }, [blades])

  const armorIdMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of armor) map.set(a.name, a.id)
    return map
  }, [armor])

  // ── Search state ────────────────────────────────────────────────────

  const [discoverResults, setDiscoverResults] = useState<CraftableResult[]>([])
  const [discoverSearched, setDiscoverSearched] = useState(false)
  const [reversePaths, setReversePaths] = useState<CraftingPath[]>([])
  const [reverseSearched, setReverseSearched] = useState(false)
  const [decompTrees, setDecompTrees] = useState<DecompNode[]>([])
  const [decompSearched, setDecompSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  // ── Web Worker ──────────────────────────────────────────────────────

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
      } else if (res.type === "decompose" && res.decompTrees) {
        setDecompTrees(res.decompTrees)
        setDecompSearched(true)
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

  // ── Search actions ──────────────────────────────────────────────────

  const runSearch = () => {
    if (!recipesReady) return

    if (mode === "forward" && forwardCategory) {
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
    } else if (mode === "reverse" && targetItem) {
      setReverseSearched(false)
      setDecompSearched(false)

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
        type: "decompose",
        craftingRecipes: filteredRecipes,
        materialRecipes,
        craftables: filtered,
        targetName: targetItem,
        maxDepth: searchDepth,
      })
    }
  }

  // After decompose completes, fire the reverse BFS search
  useEffect(() => {
    if (!decompSearched || !recipesReady || !targetItem) return

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decompSearched])

  // ── Picker items ────────────────────────────────────────────────────

  const allPickerItems: PickerItem[] = useMemo(
    () => [
      ...blades.map((b) => ({
        name: b.name,
        type: b.blade_type,
        level: b.game_id,
        suffix: b.hands,
      })),
      ...armor.map((a) => ({
        name: a.name,
        type: a.armor_type,
        level: a.game_id,
      })),
    ],
    [blades, armor]
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

  // ── Build unified result rows ───────────────────────────────────────

  const findWorkshops = useCallback(
    (material: string): { id: number; name: string }[] => {
      return workshops
        .filter((w) =>
          w.available_materials
            .split(",")
            .map((s) => s.trim())
            .includes(material)
        )
        .map((w) => ({ id: w.id, name: w.name }))
    },
    [workshops]
  )

  const enrichItem = useCallback(
    (name: string, equipType: string, material: string) => ({
      name,
      material,
      equipType,
      damageType: bladeDamageMap.get(name),
      hands: bladeHandsMap.get(name),
    }),
    [bladeDamageMap, bladeHandsMap]
  )

  const resultRows: ResultRow[] = useMemo(() => {
    if (mode === "forward" && discoverSearched) {
      return discoverResults
        .filter(
          (r) =>
            r.materialUpgrade ||
            r.step.recipe.tier_change > 0 ||
            (r.statDiff && r.statDiff.total > 0)
        )
        .sort((a, b) => b.score - a.score)
        .map((r, i) => {
          const lastStep = r.step
          const result = enrichItem(
            r.result.name,
            r.result.equipType,
            r.result.material
          )
          const s1 = enrichItem(
            lastStep.input1.name,
            lastStep.input1.equipType,
            lastStep.input1.material
          )
          const s2 = enrichItem(
            lastStep.input2.name,
            lastStep.input2.equipType,
            lastStep.input2.material
          )
          return {
            key: `fwd-${i}`,
            resultName: result.name,
            resultMaterial: result.material,
            resultEquipType: result.equipType,
            resultDamageType: result.damageType,
            resultHands: result.hands,
            statDiff: r.statDiff,
            steps: r.steps,
            slot1Name: s1.name,
            slot1Material: s1.material,
            slot1EquipType: s1.equipType,
            slot1DamageType: s1.damageType,
            slot1Hands: s1.hands,
            slot2Name: s2.name,
            slot2Material: s2.material,
            slot2EquipType: s2.equipType,
            slot2DamageType: s2.damageType,
            slot2Hands: s2.hands,
            workshops: findWorkshops(result.material),
            path: r.path,
            materialUpgrade: r.materialUpgrade,
            tierChange: r.step.recipe.tier_change,
          }
        })
    }

    if (mode === "reverse" && reverseSearched) {
      return reversePaths
        .sort((a, b) => b.score - a.score)
        .map((p, i) => {
          const lastStep = p.steps[p.steps.length - 1]
          const result = enrichItem(
            p.result.name,
            p.result.equipType,
            p.result.material
          )
          const s1 = enrichItem(
            lastStep.input1.name,
            lastStep.input1.equipType,
            lastStep.input1.material
          )
          const s2 = enrichItem(
            lastStep.input2.name,
            lastStep.input2.equipType,
            lastStep.input2.material
          )
          return {
            key: `rev-${i}`,
            resultName: result.name,
            resultMaterial: result.material,
            resultEquipType: result.equipType,
            resultDamageType: result.damageType,
            resultHands: result.hands,
            statDiff: null,
            steps: p.steps.length,
            slot1Name: s1.name,
            slot1Material: s1.material,
            slot1EquipType: s1.equipType,
            slot1DamageType: s1.damageType,
            slot1Hands: s1.hands,
            slot2Name: s2.name,
            slot2Material: s2.material,
            slot2EquipType: s2.equipType,
            slot2DamageType: s2.damageType,
            slot2Hands: s2.hands,
            workshops: findWorkshops(result.material),
            path: p.steps,
            decompTree: decompTrees[0],
            materialUpgrade: false,
            tierChange: lastStep.recipe.tier_change,
          }
        })
    }

    return []
  }, [
    mode,
    discoverSearched,
    discoverResults,
    reverseSearched,
    reversePaths,
    decompTrees,
    enrichItem,
    findWorkshops,
  ])

  const hasSearched =
    (mode === "forward" && discoverSearched) ||
    (mode === "reverse" && reverseSearched)

  // ── Reset ───────────────────────────────────────────────────────────

  const handleReset = () => {
    setForwardCategory(null)
    setTargetItem(null)
    setTargetMaterial(null)
    setDiscoverSearched(false)
    setReverseSearched(false)
    setDecompSearched(false)
    setDiscoverResults([])
    setReversePaths([])
    setDecompTrees([])
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-3 lg:flex-nowrap">
        <div className="w-full min-w-[10rem] flex-1">
          <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
            Select a Category
          </label>
          <Select
            value={forwardCategory ?? ""}
            onValueChange={(v) => {
              setForwardCategory(v as Category)
              setTargetItem(null)
              setTargetMaterial(null)
              setDiscoverSearched(false)
              setReverseSearched(false)
            }}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blade">Blades</SelectItem>
              <SelectItem value="shield">Shields</SelectItem>
              <SelectItem value="armor">Armor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden shrink-0 lg:block">
          <div className="mb-1 text-[11px]">&nbsp;</div>
          <div className="flex h-9 items-center">
            <span className="text-muted-foreground text-xs font-medium">
              OR
            </span>
          </div>
        </div>

        <div className="w-full min-w-[10rem] flex-1">
          <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
            Select an Item
          </label>
          <ItemPicker
            items={allPickerItems}
            value={targetItem}
            onSelect={(name) => {
              setTargetItem(name)
              setForwardCategory(null)
              setTargetMaterial(null)
              setDiscoverSearched(false)
              setReverseSearched(false)
            }}
            placeholder="Search for item..."
            triggerClassName="!min-h-9 !h-9 py-1"
          />
        </div>

        {targetItem && targetMaterials.length > 0 && (
          <div className="min-w-[10rem]">
            <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Material
            </label>
            <MaterialSelect
              materials={targetMaterials}
              value={targetMaterial}
              onSelect={(m) => {
                setTargetMaterial(m)
                setReverseSearched(false)
              }}
            />
          </div>
        )}

        <div className="shrink-0">
          <label className="text-muted-foreground mb-1 block text-[11px] font-medium">
            Depth
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

      {/* Search button */}
      {mode && (
        <div className="flex justify-center py-2">
          <Button
            onClick={runSearch}
            size="lg"
            disabled={searching || !recipesReady}
            className="min-w-[16rem] text-base"
          >
            {searching ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : (
              <Zap className="mr-2 size-5" />
            )}
            {searching ? "Optimizing..." : "Optimize"}
          </Button>
        </div>
      )}

      {/* Results table */}
      {hasSearched && resultRows.length > 0 && (
        <ResultsTable
          rows={resultRows}
          isReverse={mode === "reverse"}
          bladeIdMap={bladeIdMap}
          armorIdMap={armorIdMap}
        />
      )}

      {/* Empty state */}
      {hasSearched && resultRows.length === 0 && (
        <div className="text-muted-foreground py-6 text-center text-sm">
          <FlaskConical className="mx-auto mb-2 size-8 opacity-30" />
          <p>No results found with your current inventory</p>
          <p className="mt-1 text-xs">
            Try different settings or add more items to your inventory
          </p>
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

// ── Results table ─────────────────────────────────────────────────────

function ResultsTable({
  rows,
  isReverse,
  bladeIdMap,
  armorIdMap,
}: {
  rows: ResultRow[]
  isReverse: boolean
  bladeIdMap: Map<string, number>
  armorIdMap: Map<string, number>
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const getItemLink = useCallback(
    (name: string) => {
      const bId = bladeIdMap.get(name)
      if (bId) return { linkTo: "/blades/$id", linkId: bId }
      const aId = armorIdMap.get(name)
      if (aId) return { linkTo: "/armor/$id", linkId: aId }
      return {}
    },
    [bladeIdMap, armorIdMap]
  )

  const columns = useMemo<ColumnDef<ResultRow>[]>(() => {
    const cols: ColumnDef<ResultRow>[] = [
      {
        accessorKey: "resultName",
        header: "Result",
        cell: ({ row }) => (
          <div>
            <ItemCell
              name={row.original.resultName}
              material={row.original.resultMaterial}
              equipType={row.original.resultEquipType}
              damageType={row.original.resultDamageType}
              hands={row.original.resultHands}
              {...getItemLink(row.original.resultName)}
            />
            <div className="mt-0.5 flex gap-1">
              {row.original.materialUpgrade && (
                <span className="rounded bg-green-500/15 px-1 py-0.5 text-[9px] font-semibold text-green-400">
                  MAT UP
                </span>
              )}
              {row.original.tierChange > 0 && (
                <span className="bg-primary/15 text-primary rounded px-1 py-0.5 text-[9px] font-semibold">
                  TIER UP
                </span>
              )}
            </div>
          </div>
        ),
      },
    ]

    if (!isReverse) {
      cols.push({
        accessorFn: (row) => row.statDiff?.total ?? 0,
        id: "statDiff",
        header: "Stat Diff",
        cell: ({ row }) => <StatDiffCell diff={row.original.statDiff} />,
      })
    }

    cols.push(
      {
        accessorKey: "steps",
        header: "Steps",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.steps}</span>
        ),
      },
      {
        accessorKey: "slot1Name",
        header: "Slot 1",
        cell: ({ row }) => (
          <ItemCell
            name={row.original.slot1Name}
            material={row.original.slot1Material}
            equipType={row.original.slot1EquipType}
            damageType={row.original.slot1DamageType}
            hands={row.original.slot1Hands}
            {...getItemLink(row.original.slot1Name)}
          />
        ),
      },
      {
        accessorKey: "slot2Name",
        header: "Slot 2",
        cell: ({ row }) => (
          <ItemCell
            name={row.original.slot2Name}
            material={row.original.slot2Material}
            equipType={row.original.slot2EquipType}
            damageType={row.original.slot2DamageType}
            hands={row.original.slot2Hands}
            {...getItemLink(row.original.slot2Name)}
          />
        ),
      },
      {
        accessorFn: (row) => row.workshops.map((w) => w.name).join(", "),
        id: "workshops",
        header: "Workshops",
        cell: ({ row }) => (
          <span className="text-[11px]">
            {row.original.workshops.length > 0 ? (
              row.original.workshops.map((w, i) => (
                <span key={w.id}>
                  {i > 0 && <span className="text-muted-foreground">, </span>}
                  <Link
                    to="/workshops/$id"
                    params={{ id: String(w.id) }}
                    target="_blank"
                    className="text-primary/80 hover:text-primary underline decoration-transparent transition-colors hover:decoration-current"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {w.name}
                  </Link>
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        ),
      }
    )

    return cols
  }, [isReverse, getItemLink])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getRowId: (row) => row.key,
    getRowCanExpand: () => true,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase()
      const r = row.original
      // Search visible columns
      if (r.resultName.toLowerCase().includes(q)) return true
      if (r.slot1Name.toLowerCase().includes(q)) return true
      if (r.slot2Name.toLowerCase().includes(q)) return true
      if (r.resultMaterial.toLowerCase().includes(q)) return true
      if (r.workshops.some((w) => w.name.toLowerCase().includes(q))) return true
      // Search step tree items
      for (const step of r.path) {
        if (step.input1.name.toLowerCase().includes(q)) return true
        if (step.input2.name.toLowerCase().includes(q)) return true
        if (step.result.name.toLowerCase().includes(q)) return true
      }
      return false
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const filtered = table.getFilteredRowModel().rows.length
  const totalPages = table.getPageCount()
  const page = table.getState().pagination.pageIndex
  const colCount = columns.length

  return (
    <div className="space-y-3">
      {/* Search + count */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Input
            placeholder="Filter results..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
            className="h-8 pr-8 text-xs"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => {
                setGlobalFilter("")
                table.setPageIndex(0)
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <span className="text-muted-foreground text-xs">
          {filtered} result{filtered !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            table.toggleAllRowsExpanded(!table.getIsAllRowsExpanded())
          }
          className="ml-auto h-7 gap-1.5 px-2 text-xs"
        >
          <ChevronsRight
            className={cn(
              "size-3.5 transition-transform",
              table.getIsAllRowsExpanded() ? "-rotate-90" : "rotate-90"
            )}
          />
          {table.getIsAllRowsExpanded() ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-border text-muted-foreground border-b text-left"
              >
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-2 py-2 font-medium",
                      header.id === "steps" && "text-center",
                      header.column.getCanSort() && "cursor-pointer select-none"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <>
                <tr
                  key={row.id}
                  onClick={() => row.toggleExpanded()}
                  className={cn(
                    "border-border/50 cursor-pointer border-b transition-colors",
                    row.getIsExpanded() ? "bg-primary/10" : "hover:bg-muted/30"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-2 py-2",
                        cell.column.id === "steps" && "text-center"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr key={`${row.id}-detail`}>
                    <td
                      colSpan={colCount}
                      className="border-border/50 border-b p-0"
                    >
                      <ExpandedDetail
                        row={row.original}
                        bladeIdMap={bladeIdMap}
                        armorIdMap={armorIdMap}
                        isReverse={isReverse}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Rows</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => {
                table.setPageSize(Number(v))
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-muted-foreground px-2 text-xs">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3" />
  if (sorted === "desc") return <ArrowDown className="size-3" />
  return <ArrowUpDown className="text-muted-foreground/50 size-3" />
}

function ItemCell({
  name,
  material,
  equipType,
  damageType,
  hands,
  linkTo,
  linkId,
}: {
  name: string
  material: string
  equipType: string
  damageType?: string
  hands?: string
  linkTo?: string
  linkId?: number
}) {
  const nameEl =
    linkTo && linkId ? (
      <Link
        to={linkTo}
        params={{ id: String(linkId) }}
        target="_blank"
        className="hover:text-primary truncate font-medium underline decoration-transparent transition-colors hover:decoration-current"
        onClick={(e) => e.stopPropagation()}
      >
        {name}
      </Link>
    ) : (
      <span className="truncate font-medium">{name}</span>
    )

  return (
    <div className="flex items-center gap-2">
      <ItemIcon type={equipType} size="sm" />
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1">
          {nameEl}
          {material && <MaterialBadge mat={material} />}
        </div>
        {(damageType || hands) && (
          <div className="flex flex-wrap items-center gap-1">
            {damageType && <DamageTypeBadge type={damageType} />}
            {hands && (
              <span className="text-muted-foreground text-[10px]">{hands}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatDiffCell({
  diff,
}: {
  diff: { str: number; int: number; agi: number } | null
}) {
  if (!diff) return <span className="text-muted-foreground">—</span>

  const stats = [
    { label: "STR", value: diff.str },
    { label: "INT", value: diff.int },
    { label: "AGI", value: diff.agi },
  ].filter((s) => s.value !== 0)

  if (stats.length === 0)
    return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex flex-col gap-0.5">
      {stats.map((s) => (
        <span
          key={s.label}
          className={cn(
            "text-[10px] font-medium",
            s.value > 0 ? "text-green-400" : "text-red-400"
          )}
        >
          {s.label} {s.value > 0 ? "+" : ""}
          {s.value}
        </span>
      ))}
    </div>
  )
}

// ── Expanded row detail ───────────────────────────────────────────────

function ExpandedDetail({
  row,
  bladeIdMap,
  armorIdMap,
  isReverse,
}: {
  row: ResultRow
  bladeIdMap: Map<string, number>
  armorIdMap: Map<string, number>
  isReverse: boolean
}) {
  return (
    <div className="bg-muted/20 space-y-1.5 px-4 py-3">
      {/* Steps */}
      {row.path.map((step, i) => (
        <div
          key={i}
          className="bg-background/50 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs"
        >
          <span className="text-muted-foreground font-mono">{i + 1}.</span>
          <StepItemLink
            name={step.input1.name}
            equipType={step.input1.equipType}
            material={step.input1.material}
            bladeIdMap={bladeIdMap}
            armorIdMap={armorIdMap}
          />
          <span className="text-muted-foreground">+</span>
          <StepItemLink
            name={step.input2.name}
            equipType={step.input2.equipType}
            material={step.input2.material}
            bladeIdMap={bladeIdMap}
            armorIdMap={armorIdMap}
          />
          <ChevronRight className="text-muted-foreground size-3" />
          <div className="flex items-center gap-1">
            <span className="text-primary font-medium">{step.result.name}</span>
            {step.result.material && (
              <MaterialBadge mat={step.result.material} />
            )}
          </div>
        </div>
      ))}

      {/* Decomp tree for reverse mode */}
      {isReverse && row.decompTree && (
        <RecipeTree
          tree={row.decompTree}
          bladeIdMap={bladeIdMap}
          armorIdMap={armorIdMap}
        />
      )}
    </div>
  )
}

function StepItemLink({
  name,
  equipType,
  material,
  bladeIdMap,
  armorIdMap,
}: {
  name: string
  equipType: string
  material: string
  bladeIdMap: Map<string, number>
  armorIdMap: Map<string, number>
}) {
  const bladeId = bladeIdMap.get(name)
  const armorId = armorIdMap.get(name)

  const content = (
    <div className="flex items-center gap-1">
      <ItemIcon type={equipType} size="sm" />
      <span className="font-medium">{name}</span>
      {material && <MaterialBadge mat={material} />}
    </div>
  )

  if (bladeId) {
    return (
      <Link
        to="/blades/$id"
        params={{ id: String(bladeId) }}
        target="_blank"
        className="hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </Link>
    )
  }

  if (armorId) {
    return (
      <Link
        to="/armor/$id"
        params={{ id: String(armorId) }}
        target="_blank"
        className="hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </Link>
    )
  }

  return content
}

// ── Recipe decomposition tree ─────────────────────────────────────────

function RecipeTree({
  tree,
  bladeIdMap,
  armorIdMap,
}: {
  tree: DecompNode
  bladeIdMap: Map<string, number>
  armorIdMap: Map<string, number>
}) {
  const available = countTreeAvailable(tree)
  const total = countTreeTotal(tree)

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        Recipe blueprint —{" "}
        <span className={available === total ? "text-green-400" : ""}>
          {available}/{total} ingredients available
        </span>
      </p>
      <Card>
        <CardContent className="p-3">
          <TreeNode
            node={tree}
            bladeIdMap={bladeIdMap}
            armorIdMap={armorIdMap}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function TreeNode({
  node,
  bladeIdMap,
  armorIdMap,
}: {
  node: DecompNode
  bladeIdMap: Map<string, number>
  armorIdMap: Map<string, number>
}) {
  const indent = node.depth * 16

  if (!node.inputs) {
    const bladeId = bladeIdMap.get(node.name)
    const armorId = armorIdMap.get(node.name)
    const linkTo = bladeId ? "/blades/$id" : armorId ? "/armor/$id" : null
    const linkId = bladeId ?? armorId

    const nameEl =
      linkTo && linkId ? (
        <Link
          to={linkTo}
          params={{ id: String(linkId) }}
          target="_blank"
          className={cn(
            "text-xs font-medium transition-colors",
            node.available
              ? "hover:text-primary"
              : "text-red-400 hover:text-red-300"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {node.name}
        </Link>
      ) : (
        <span
          className={cn(
            "text-xs font-medium",
            !node.available && "text-red-400"
          )}
        >
          {node.name}
        </span>
      )

    return (
      <div
        className="flex items-center gap-2 py-1"
        style={{ paddingLeft: indent }}
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            node.available ? "bg-green-400" : "bg-red-400"
          )}
        />
        {nameEl}
        {node.available && node.inventoryItem?.material && (
          <MaterialBadge mat={node.inventoryItem.material} />
        )}
        {!node.available && (
          <span className="text-[10px] text-red-400/70">missing</span>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1"
        style={{ paddingLeft: indent }}
      >
        <ChevronRight className="text-muted-foreground size-3" />
        <span className="text-xs font-medium">{node.name}</span>
        {node.recipe && (
          <span className="text-muted-foreground text-[10px]">
            = {node.recipe.input_1} + {node.recipe.input_2}
          </span>
        )}
      </div>
      <TreeNode
        node={node.inputs[0]}
        bladeIdMap={bladeIdMap}
        armorIdMap={armorIdMap}
      />
      <TreeNode
        node={node.inputs[1]}
        bladeIdMap={bladeIdMap}
        armorIdMap={armorIdMap}
      />
    </div>
  )
}

function countTreeAvailable(node: DecompNode): number {
  if (node.available) return 1
  if (!node.inputs) return 0
  return countTreeAvailable(node.inputs[0]) + countTreeAvailable(node.inputs[1])
}

function countTreeTotal(node: DecompNode): number {
  if (!node.inputs) return 1
  return countTreeTotal(node.inputs[0]) + countTreeTotal(node.inputs[1])
}
