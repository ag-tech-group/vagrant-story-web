import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeftRight, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ItemIcon } from "@/components/item-icon"
import { ItemPicker, type PickerItem } from "@/components/item-picker"
import { MaterialSelect } from "@/components/material-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DamageTypeBadge, MaterialBadge } from "@/components/stat-display"
import {
  gameApi,
  type Armor,
  type Blade,
  type Gem,
  type Grip,
  type Material,
} from "@/lib/game-api"
import { cn } from "@/lib/utils"

const BLADE_MATS = ["Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const ARMOR_MATS = ["Leather", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const SHIELD_MATS = ["Wood", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]

type EquipMode = "blade" | "armor" | "shield" | null

// Maps blade_type to the format used in compatible_weapons
// blade_type: "Axe / Mace" -> compatible_weapons uses "Axe/Mace"
function bladeTypeToCompatible(bladeType: string): string {
  if (bladeType === "Axe / Mace") return "Axe/Mace"
  return bladeType
}

function getCompatibleGrips(grips: Grip[], bladeType: string): Grip[] {
  const compatKey = bladeTypeToCompatible(bladeType)
  return grips.filter((g) => {
    const weapons = g.compatible_weapons.split("/")
    return weapons.includes(compatKey)
  })
}

function getModeForItem(
  item: string,
  bladeMap: Map<string, Blade>,
  armorMap: Map<string, Armor>
): EquipMode {
  if (bladeMap.has(item)) return "blade"
  const armor = armorMap.get(item)
  if (!armor) return null
  if (armor.armor_type === "Shield") return "shield"
  return "armor"
}

function getMaterialsForMode(mode: EquipMode): string[] {
  if (mode === "blade") return BLADE_MATS
  if (mode === "armor") return ARMOR_MATS
  if (mode === "shield") return SHIELD_MATS
  return []
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Equipment" },
  { value: "blades", label: "Blades" },
  { value: "armor", label: "Armor" },
  { value: "shields", label: "Shields" },
]

/** Map a category filter value to the mode it represents (for locking in compare mode) */
function modeToCategory(mode: EquipMode): string {
  if (mode === "blade") return "blades"
  if (mode === "armor") return "armor"
  if (mode === "shield") return "shields"
  return "all"
}

interface BuildState {
  selectedItem: string | null
  selectedMaterial: string | null
  selectedGrip: string | null
  selectedGems: (string | null)[]
}

interface CombinedBladeStats {
  mode: "blade"
  str: number
  int: number
  agi: number
  range: number
  risk: number
  damage_type: string
  blunt: number
  edged: number
  piercing: number
  gem_slots: number
}

interface CombinedArmorStats {
  mode: "armor" | "shield"
  str: number
  int: number
  agi: number
  gem_slots: number
}

type CombinedStats = CombinedBladeStats | CombinedArmorStats

/** Compute gem stat totals from selected gem names */
function computeGemTotals(
  selectedGems: (string | null)[],
  gemMap: Map<string, Gem>
) {
  const totals = {
    str: 0,
    int: 0,
    agi: 0,
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
  for (const name of selectedGems) {
    if (!name) continue
    const gem = gemMap.get(name)
    if (!gem) continue
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
      totals[key] += gem[key]
    }
  }
  return totals
}

/** Compute combined stats for a build */
function computeCombinedStats(
  build: BuildState,
  mode: EquipMode,
  bladeMap: Map<string, Blade>,
  armorMap: Map<string, Armor>,
  gripMap: Map<string, Grip>,
  materialMap: Map<string, Material>,
  gemTotals: ReturnType<typeof computeGemTotals>
): CombinedStats | null {
  const { selectedItem, selectedMaterial, selectedGrip } = build
  if (!selectedItem || !selectedMaterial) return null

  const mat = materialMap.get(selectedMaterial)
  if (!mat) return null

  if (mode === "blade") {
    const blade = bladeMap.get(selectedItem)
    if (!blade) return null
    const grip = selectedGrip ? gripMap.get(selectedGrip) : null

    return {
      mode: "blade" as const,
      str: blade.str + mat.blade_str + (grip?.str ?? 0) + gemTotals.str,
      int: blade.int + mat.blade_int + (grip?.int ?? 0) + gemTotals.int,
      agi: blade.agi + mat.blade_agi + (grip?.agi ?? 0) + gemTotals.agi,
      range: blade.range,
      risk: blade.risk,
      damage_type: blade.damage_type,
      blunt: grip?.blunt ?? 0,
      edged: grip?.edged ?? 0,
      piercing: grip?.piercing ?? 0,
      gem_slots: grip?.gem_slots ?? 0,
    }
  }

  if (mode === "armor") {
    const armorItem = armorMap.get(selectedItem)
    if (!armorItem) return null
    return {
      mode: "armor" as const,
      str: armorItem.str + mat.armor_str + gemTotals.str,
      int: armorItem.int + mat.armor_int + gemTotals.int,
      agi: armorItem.agi + mat.armor_agi + gemTotals.agi,
      gem_slots: armorItem.gem_slots,
    }
  }

  if (mode === "shield") {
    const shield = armorMap.get(selectedItem)
    if (!shield) return null
    return {
      mode: "shield" as const,
      str: shield.str + mat.shield_str + gemTotals.str,
      int: shield.int + mat.shield_int + gemTotals.int,
      agi: shield.agi + mat.shield_agi + gemTotals.agi,
      gem_slots: shield.gem_slots,
    }
  }

  return null
}

/** Compute affinity totals for a build's material + gems */
function computeAffinities(
  selectedMaterial: string | null,
  materialMap: Map<string, Material>,
  gemTotals: ReturnType<typeof computeGemTotals>
) {
  if (!selectedMaterial) return null
  const mat = materialMap.get(selectedMaterial)
  if (!mat) return null
  return {
    human: mat.human + gemTotals.human,
    beast: mat.beast + gemTotals.beast,
    undead: mat.undead + gemTotals.undead,
    phantom: mat.phantom + gemTotals.phantom,
    dragon: mat.dragon + gemTotals.dragon,
    evil: mat.evil + gemTotals.evil,
    physical: gemTotals.physical,
    fire: mat.fire + gemTotals.fire,
    water: mat.water + gemTotals.water,
    wind: mat.wind + gemTotals.wind,
    earth: mat.earth + gemTotals.earth,
    light: mat.light + gemTotals.light,
    dark: mat.dark + gemTotals.dark,
  }
}

export function ForgePage() {
  // Build A state
  const [buildA, setBuildA] = useState<BuildState>({
    selectedItem: null,
    selectedMaterial: null,
    selectedGrip: null,
    selectedGems: [],
  })
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Compare mode
  const [isComparing, setIsComparing] = useState(false)
  const [buildB, setBuildB] = useState<BuildState>({
    selectedItem: null,
    selectedMaterial: null,
    selectedGrip: null,
    selectedGems: [],
  })

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setBuildA({
      selectedItem: null,
      selectedMaterial: null,
      selectedGrip: null,
      selectedGems: [],
    })
    if (isComparing) {
      setIsComparing(false)
      setBuildB({
        selectedItem: null,
        selectedMaterial: null,
        selectedGrip: null,
        selectedGems: [],
      })
    }
  }

  const { data: blades = [] } = useQuery({
    queryKey: ["blades"],
    queryFn: gameApi.blades,
  })
  const { data: armor = [] } = useQuery({
    queryKey: ["armor"],
    queryFn: gameApi.armor,
  })
  const { data: grips = [] } = useQuery({
    queryKey: ["grips"],
    queryFn: gameApi.grips,
  })
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: gameApi.materials,
  })
  const { data: gems = [] } = useQuery({
    queryKey: ["gems"],
    queryFn: gameApi.gems,
  })

  const fmt = (s: string) => s.replace(/_/g, " ")

  // Build lookup maps keyed by field_name (formatted)
  const bladeMap = useMemo(() => {
    const map = new Map<string, Blade>()
    for (const b of blades) map.set(fmt(b.field_name), b)
    return map
  }, [blades])

  const armorMap = useMemo(() => {
    const map = new Map<string, Armor>()
    for (const a of armor) {
      if (a.armor_type === "Accessory") continue
      map.set(fmt(a.field_name), a)
    }
    return map
  }, [armor])

  const gripMap = useMemo(() => {
    const map = new Map<string, Grip>()
    for (const g of grips) map.set(fmt(g.field_name), g)
    return map
  }, [grips])

  const materialMap = useMemo(() => {
    const map = new Map<string, Material>()
    for (const m of materials) map.set(m.name, m)
    return map
  }, [materials])

  const gemMap = useMemo(() => {
    const map = new Map<string, Gem>()
    for (const g of gems) map.set(fmt(g.field_name), g)
    return map
  }, [gems])

  // Build picker items
  const allItems: PickerItem[] = useMemo(() => {
    const items: PickerItem[] = []
    const byType = new Map<
      string,
      { name: string; type: string; gameId: number }[]
    >()

    for (const b of blades) {
      const type = b.blade_type
      if (!byType.has(type)) byType.set(type, [])
      byType
        .get(type)!
        .push({ name: fmt(b.field_name), type, gameId: b.game_id })
    }
    for (const a of armor) {
      if (a.armor_type === "Accessory") continue
      const type = a.armor_type
      if (!byType.has(type)) byType.set(type, [])
      byType
        .get(type)!
        .push({ name: fmt(a.field_name), type, gameId: a.game_id })
    }

    const seen = new Set<string>()
    for (const group of byType.values()) {
      group.sort((a, b) => a.gameId - b.gameId)
      for (let i = 0; i < group.length; i++) {
        const item = group[i]
        if (!seen.has(item.name)) {
          seen.add(item.name)
          items.push({ name: item.name, type: item.type, level: i + 1 })
        }
      }
    }
    return items
  }, [blades, armor])

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return allItems
    const bladeTypes = new Set(blades.map((b) => b.blade_type))
    const armorTypes = new Set(
      armor
        .filter(
          (a) => a.armor_type !== "Shield" && a.armor_type !== "Accessory"
        )
        .map((a) => a.armor_type)
    )
    return allItems.filter((item) => {
      if (categoryFilter === "blades") return bladeTypes.has(item.type)
      if (categoryFilter === "armor") return armorTypes.has(item.type)
      if (categoryFilter === "shields") return item.type === "Shield"
      return true
    })
  }, [allItems, categoryFilter, blades, armor])

  // Mode for Build A
  const modeA = buildA.selectedItem
    ? getModeForItem(buildA.selectedItem, bladeMap, armorMap)
    : null

  // Mode for Build B (should match Build A's category)
  const modeB = buildB.selectedItem
    ? getModeForItem(buildB.selectedItem, bladeMap, armorMap)
    : null

  // Gem totals
  const gemTotalsA = useMemo(
    () => computeGemTotals(buildA.selectedGems, gemMap),
    [buildA.selectedGems, gemMap]
  )
  const gemTotalsB = useMemo(
    () => computeGemTotals(buildB.selectedGems, gemMap),
    [buildB.selectedGems, gemMap]
  )

  // Combined stats
  const combinedStatsA = useMemo(
    () =>
      computeCombinedStats(
        buildA,
        modeA,
        bladeMap,
        armorMap,
        gripMap,
        materialMap,
        gemTotalsA
      ),
    [buildA, modeA, bladeMap, armorMap, gripMap, materialMap, gemTotalsA]
  )

  const combinedStatsB = useMemo(
    () =>
      computeCombinedStats(
        buildB,
        modeB,
        bladeMap,
        armorMap,
        gripMap,
        materialMap,
        gemTotalsB
      ),
    [buildB, modeB, bladeMap, armorMap, gripMap, materialMap, gemTotalsB]
  )

  // Affinities
  const affinitiesA = useMemo(
    () => computeAffinities(buildA.selectedMaterial, materialMap, gemTotalsA),
    [buildA.selectedMaterial, materialMap, gemTotalsA]
  )
  const affinitiesB = useMemo(
    () => computeAffinities(buildB.selectedMaterial, materialMap, gemTotalsB),
    [buildB.selectedMaterial, materialMap, gemTotalsB]
  )

  // Whether compare button should be enabled
  const canCompare =
    buildA.selectedItem != null && buildA.selectedMaterial != null

  function handleEnterCompare() {
    // Lock category to Build A's mode
    if (modeA) {
      setCategoryFilter(modeToCategory(modeA))
    }
    // Copy Build A state to Build B
    setBuildB({
      selectedItem: buildA.selectedItem,
      selectedMaterial: buildA.selectedMaterial,
      selectedGrip: buildA.selectedGrip,
      selectedGems: [...buildA.selectedGems],
    })
    setIsComparing(true)
  }

  function handleCancelCompare() {
    setIsComparing(false)
    setBuildB({
      selectedItem: null,
      selectedMaterial: null,
      selectedGrip: null,
      selectedGems: [],
    })
    // Unlock category
    if (modeA) {
      setCategoryFilter(modeToCategory(modeA))
    }
  }

  function handleReset() {
    setBuildA({
      selectedItem: null,
      selectedMaterial: null,
      selectedGrip: null,
      selectedGems: [],
    })
    setCategoryFilter("all")
    if (isComparing) {
      setIsComparing(false)
      setBuildB({
        selectedItem: null,
        selectedMaterial: null,
        selectedGrip: null,
        selectedGems: [],
      })
    }
  }

  // Build helpers for Build A
  function handleItemSelectA(name: string | null) {
    setBuildA((prev) => ({
      ...prev,
      selectedItem: name,
      selectedMaterial: null,
      selectedGrip: null,
      selectedGems: [],
    }))
  }

  function handleGripSelectA(name: string | null) {
    setBuildA((prev) => ({
      ...prev,
      selectedGrip: name,
      selectedGems: [],
    }))
  }

  function handleGemSelectA(slotIndex: number, gemName: string | null) {
    setBuildA((prev) => {
      const next = [...prev.selectedGems]
      while (next.length <= slotIndex) next.push(null)
      next[slotIndex] = gemName
      return { ...prev, selectedGems: next }
    })
  }

  // Build helpers for Build B
  function handleItemSelectB(name: string | null) {
    setBuildB((prev) => ({
      ...prev,
      selectedItem: name,
      selectedMaterial: null,
      selectedGrip: null,
      selectedGems: [],
    }))
  }

  function handleGripSelectB(name: string | null) {
    setBuildB((prev) => ({
      ...prev,
      selectedGrip: name,
      selectedGems: [],
    }))
  }

  function handleGemSelectB(slotIndex: number, gemName: string | null) {
    setBuildB((prev) => {
      const next = [...prev.selectedGems]
      while (next.length <= slotIndex) next.push(null)
      next[slotIndex] = gemName
      return { ...prev, selectedGems: next }
    })
  }

  // Computed props for Build A panel
  const availableMaterialsA = getMaterialsForMode(modeA)
  const compatibleGripsA: PickerItem[] = useMemo(() => {
    if (modeA !== "blade" || !buildA.selectedItem) return []
    const blade = bladeMap.get(buildA.selectedItem)
    if (!blade) return []
    const compatible = getCompatibleGrips(grips, blade.blade_type)
    return compatible.map((g, i) => ({
      name: fmt(g.field_name),
      type: g.grip_type,
      level: i + 1,
    }))
  }, [modeA, buildA.selectedItem, bladeMap, grips])

  const gemSlotCountA = useMemo(() => {
    if (!buildA.selectedItem || !modeA) return 0
    if (modeA === "blade") {
      const grip = buildA.selectedGrip ? gripMap.get(buildA.selectedGrip) : null
      return grip?.gem_slots ?? 0
    }
    const armorItem = armorMap.get(buildA.selectedItem)
    return armorItem?.gem_slots ?? 0
  }, [buildA.selectedItem, buildA.selectedGrip, modeA, gripMap, armorMap])

  const availableGemsA = useMemo(() => {
    return gems.filter((g) => {
      if (modeA === "blade")
        return g.gem_type === "Weapon" || g.gem_type === "Both"
      return g.gem_type === "Armor" || g.gem_type === "Both"
    })
  }, [gems, modeA])

  // Computed props for Build B panel
  const availableMaterialsB = getMaterialsForMode(modeB)
  const compatibleGripsB: PickerItem[] = useMemo(() => {
    if (modeB !== "blade" || !buildB.selectedItem) return []
    const blade = bladeMap.get(buildB.selectedItem)
    if (!blade) return []
    const compatible = getCompatibleGrips(grips, blade.blade_type)
    return compatible.map((g, i) => ({
      name: fmt(g.field_name),
      type: g.grip_type,
      level: i + 1,
    }))
  }, [modeB, buildB.selectedItem, bladeMap, grips])

  const gemSlotCountB = useMemo(() => {
    if (!buildB.selectedItem || !modeB) return 0
    if (modeB === "blade") {
      const grip = buildB.selectedGrip ? gripMap.get(buildB.selectedGrip) : null
      return grip?.gem_slots ?? 0
    }
    const armorItem = armorMap.get(buildB.selectedItem)
    return armorItem?.gem_slots ?? 0
  }, [buildB.selectedItem, buildB.selectedGrip, modeB, gripMap, armorMap])

  const availableGemsB = useMemo(() => {
    return gems.filter((g) => {
      if (modeB === "blade")
        return g.gem_type === "Weapon" || g.gem_type === "Both"
      return g.gem_type === "Armor" || g.gem_type === "Both"
    })
  }, [gems, modeB])

  // Item type info for display
  const selectedItemDataA = buildA.selectedItem
    ? (bladeMap.get(buildA.selectedItem) ?? armorMap.get(buildA.selectedItem))
    : null
  const selectedItemTypeA = selectedItemDataA
    ? "blade_type" in selectedItemDataA
      ? selectedItemDataA.blade_type
      : selectedItemDataA.armor_type
    : undefined

  const selectedItemDataB = buildB.selectedItem
    ? (bladeMap.get(buildB.selectedItem) ?? armorMap.get(buildB.selectedItem))
    : null
  const selectedItemTypeB = selectedItemDataB
    ? "blade_type" in selectedItemDataB
      ? selectedItemDataB.blade_type
      : selectedItemDataB.armor_type
    : undefined

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={handleCategoryChange}
            disabled={isComparing}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        </div>

        <div className="flex justify-center">
          {!isComparing ? (
            <Button
              size="sm"
              onClick={handleEnterCompare}
              disabled={!canCompare}
            >
              <ArrowLeftRight className="size-3.5" />
              Compare
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCancelCompare}
            >
              <X className="size-3.5" />
              Cancel Compare
            </Button>
          )}
        </div>
      </div>

      {/* Build panels */}
      <div
        className={cn(
          "gap-6",
          isComparing ? "grid grid-cols-1 sm:grid-cols-2" : "block"
        )}
      >
        {/* Build A */}
        <BuildPanel
          label={isComparing ? "Build A" : undefined}
          build={buildA}
          mode={modeA}
          filteredItems={filteredItems}
          availableMaterials={availableMaterialsA}
          compatibleGrips={compatibleGripsA}
          gemSlotCount={gemSlotCountA}
          availableGems={availableGemsA}
          combinedStats={combinedStatsA}
          affinities={affinitiesA}
          selectedItemType={selectedItemTypeA}
          onItemSelect={handleItemSelectA}
          onMaterialSelect={(mat) =>
            setBuildA((prev) => ({ ...prev, selectedMaterial: mat }))
          }
          onGripSelect={handleGripSelectA}
          onGemSelect={handleGemSelectA}
          fmt={fmt}
        />

        {/* Build B */}
        {isComparing && (
          <BuildPanel
            label="Build B"
            build={buildB}
            mode={modeB}
            filteredItems={filteredItems}
            availableMaterials={availableMaterialsB}
            compatibleGrips={compatibleGripsB}
            gemSlotCount={gemSlotCountB}
            availableGems={availableGemsB}
            combinedStats={combinedStatsB}
            affinities={affinitiesB}
            selectedItemType={selectedItemTypeB}
            referenceStats={combinedStatsA}
            referenceAffinities={affinitiesA}
            onItemSelect={handleItemSelectB}
            onMaterialSelect={(mat) =>
              setBuildB((prev) => ({ ...prev, selectedMaterial: mat }))
            }
            onGripSelect={handleGripSelectB}
            onGemSelect={handleGemSelectB}
            fmt={fmt}
          />
        )}
      </div>
    </div>
  )
}

// ── Build Panel ──────────────────────────────────────────────────────

interface BuildPanelProps {
  label?: string
  build: BuildState
  mode: EquipMode
  filteredItems: PickerItem[]
  availableMaterials: string[]
  compatibleGrips: PickerItem[]
  gemSlotCount: number
  availableGems: Gem[]
  combinedStats: CombinedStats | null
  affinities: ReturnType<typeof computeAffinities>
  selectedItemType?: string
  referenceStats?: CombinedStats | null
  referenceAffinities?: ReturnType<typeof computeAffinities>
  onItemSelect: (name: string | null) => void
  onMaterialSelect: (mat: string | null) => void
  onGripSelect: (name: string | null) => void
  onGemSelect: (slotIndex: number, gemName: string | null) => void
  fmt: (s: string) => string
}

function BuildPanel({
  label,
  build,
  mode,
  filteredItems,
  availableMaterials,
  compatibleGrips,
  gemSlotCount,
  availableGems,
  combinedStats,
  affinities,
  selectedItemType,
  referenceStats,
  referenceAffinities,
  onItemSelect,
  onMaterialSelect,
  onGripSelect,
  onGemSelect,
  fmt,
}: BuildPanelProps) {
  const showDiff = referenceStats != null && combinedStats != null

  return (
    <div className="space-y-4">
      {/* Selection controls */}
      <div className="bg-card/50 border-border/50 space-y-4 rounded-xl border p-6">
        {label && (
          <p className="text-muted-foreground text-center text-xs font-semibold tracking-wider uppercase">
            {label}
          </p>
        )}

        {/* Item picker */}
        <div className="mx-auto max-w-xl">
          <ItemPicker
            items={filteredItems}
            value={build.selectedItem}
            onSelect={onItemSelect}
            placeholder="Search for a blade, armor, or shield..."
          />
        </div>

        {/* Material + Grip selects */}
        {mode && (
          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <MaterialSelect
                materials={availableMaterials}
                value={build.selectedMaterial}
                onSelect={onMaterialSelect}
                label="Material"
              />
            </div>
            {mode === "blade" && (
              <div className="flex-1">
                <GripPicker
                  grips={compatibleGrips}
                  value={build.selectedGrip}
                  onSelect={onGripSelect}
                />
              </div>
            )}
          </div>
        )}

        {/* Gem selectors */}
        {gemSlotCount > 0 && build.selectedMaterial && (
          <div className="mx-auto max-w-xl">
            <span className="text-muted-foreground mb-1 block text-xs font-medium">
              Gems ({gemSlotCount} slot{gemSlotCount !== 1 ? "s" : ""})
            </span>
            <div className="flex flex-col gap-2">
              {Array.from({ length: gemSlotCount }, (_, i) => (
                <Select
                  key={i}
                  value={build.selectedGems[i] ?? "__none__"}
                  onValueChange={(v) =>
                    onGemSelect(i, v === "__none__" ? null : v)
                  }
                >
                  <SelectTrigger className="h-auto min-h-12 w-full py-2">
                    <SelectValue placeholder={`Slot ${i + 1} — empty`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Empty</SelectItem>
                    {availableGems.map((g) => (
                      <SelectItem key={g.id} value={fmt(g.field_name)}>
                        <div className="flex items-center gap-2">
                          <ItemIcon type="Gem" size="sm" />
                          <span>{fmt(g.field_name)}</span>
                          <span className="text-muted-foreground text-xs">
                            {g.affinity_type}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats display */}
      {combinedStats && (
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 pt-6">
            {/* Item header */}
            <div className="flex items-center justify-center gap-2">
              <ItemIcon type={selectedItemType} size="sm" />
              <span className="text-lg font-medium">{build.selectedItem}</span>
              {build.selectedMaterial && (
                <MaterialBadge mat={build.selectedMaterial} />
              )}
            </div>

            {/* Blade stats */}
            {combinedStats.mode === "blade" && (
              <>
                {/* Damage type */}
                <div className="flex justify-center">
                  <DamageTypeBadge type={combinedStats.damage_type} />
                </div>

                {/* Core stats */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  <StatBox
                    label="STR"
                    value={combinedStats.str}
                    diff={
                      showDiff && referenceStats?.mode === "blade"
                        ? combinedStats.str - referenceStats.str
                        : undefined
                    }
                  />
                  <StatBox
                    label="INT"
                    value={combinedStats.int}
                    diff={
                      showDiff && referenceStats?.mode === "blade"
                        ? combinedStats.int - referenceStats.int
                        : undefined
                    }
                  />
                  <StatBox
                    label="AGI"
                    value={combinedStats.agi}
                    diff={
                      showDiff && referenceStats?.mode === "blade"
                        ? combinedStats.agi - referenceStats.agi
                        : undefined
                    }
                  />
                  <StatBox
                    label="RNG"
                    value={combinedStats.range}
                    diff={
                      showDiff && referenceStats?.mode === "blade"
                        ? combinedStats.range - referenceStats.range
                        : undefined
                    }
                  />
                  <StatBox
                    label="RSK"
                    value={combinedStats.risk}
                    diff={
                      showDiff && referenceStats?.mode === "blade"
                        ? combinedStats.risk - referenceStats.risk
                        : undefined
                    }
                  />
                </div>

                {/* Damage type stats (from grip) */}
                {build.selectedGrip && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <StatBox
                      label="Blt"
                      value={combinedStats.blunt}
                      diff={
                        showDiff && referenceStats?.mode === "blade"
                          ? combinedStats.blunt - referenceStats.blunt
                          : undefined
                      }
                    />
                    <StatBox
                      label="Edg"
                      value={combinedStats.edged}
                      diff={
                        showDiff && referenceStats?.mode === "blade"
                          ? combinedStats.edged - referenceStats.edged
                          : undefined
                      }
                    />
                    <StatBox
                      label="Prc"
                      value={combinedStats.piercing}
                      diff={
                        showDiff && referenceStats?.mode === "blade"
                          ? combinedStats.piercing - referenceStats.piercing
                          : undefined
                      }
                    />
                  </div>
                )}

                {/* Gem slots */}
                {build.selectedGrip && (
                  <div className="flex justify-center">
                    <StatBox
                      label="Gems"
                      value={combinedStats.gem_slots}
                      diff={
                        showDiff && referenceStats?.mode === "blade"
                          ? combinedStats.gem_slots - referenceStats.gem_slots
                          : undefined
                      }
                    />
                  </div>
                )}
              </>
            )}

            {/* Armor/Shield stats */}
            {(combinedStats.mode === "armor" ||
              combinedStats.mode === "shield") && (
              <>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <StatBox
                    label="STR"
                    value={combinedStats.str}
                    diff={
                      showDiff &&
                      referenceStats &&
                      (referenceStats.mode === "armor" ||
                        referenceStats.mode === "shield")
                        ? combinedStats.str - referenceStats.str
                        : undefined
                    }
                  />
                  <StatBox
                    label="INT"
                    value={combinedStats.int}
                    diff={
                      showDiff &&
                      referenceStats &&
                      (referenceStats.mode === "armor" ||
                        referenceStats.mode === "shield")
                        ? combinedStats.int - referenceStats.int
                        : undefined
                    }
                  />
                  <StatBox
                    label="AGI"
                    value={combinedStats.agi}
                    diff={
                      showDiff &&
                      referenceStats &&
                      (referenceStats.mode === "armor" ||
                        referenceStats.mode === "shield")
                        ? combinedStats.agi - referenceStats.agi
                        : undefined
                    }
                  />
                </div>
                {combinedStats.gem_slots != null && (
                  <div className="flex justify-center">
                    <StatBox
                      label="Gems"
                      value={combinedStats.gem_slots}
                      diff={
                        showDiff &&
                        referenceStats &&
                        (referenceStats.mode === "armor" ||
                          referenceStats.mode === "shield")
                          ? combinedStats.gem_slots - referenceStats.gem_slots
                          : undefined
                      }
                    />
                  </div>
                )}
              </>
            )}

            {/* Affinities from material + gems */}
            {affinities && (
              <>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <StatBox
                    label="Hum"
                    value={affinities.human}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.human - referenceAffinities.human
                        : undefined
                    }
                  />
                  <StatBox
                    label="Bst"
                    value={affinities.beast}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.beast - referenceAffinities.beast
                        : undefined
                    }
                  />
                  <StatBox
                    label="Und"
                    value={affinities.undead}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.undead - referenceAffinities.undead
                        : undefined
                    }
                  />
                  <StatBox
                    label="Phm"
                    value={affinities.phantom}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.phantom - referenceAffinities.phantom
                        : undefined
                    }
                  />
                  <StatBox
                    label="Drg"
                    value={affinities.dragon}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.dragon - referenceAffinities.dragon
                        : undefined
                    }
                  />
                  <StatBox
                    label="Evl"
                    value={affinities.evil}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.evil - referenceAffinities.evil
                        : undefined
                    }
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <StatBox
                    label="Phy"
                    value={affinities.physical}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.physical - referenceAffinities.physical
                        : undefined
                    }
                  />
                  <StatBox
                    label="Fir"
                    value={affinities.fire}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.fire - referenceAffinities.fire
                        : undefined
                    }
                  />
                  <StatBox
                    label="Wat"
                    value={affinities.water}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.water - referenceAffinities.water
                        : undefined
                    }
                  />
                  <StatBox
                    label="Wnd"
                    value={affinities.wind}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.wind - referenceAffinities.wind
                        : undefined
                    }
                  />
                  <StatBox
                    label="Ear"
                    value={affinities.earth}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.earth - referenceAffinities.earth
                        : undefined
                    }
                  />
                  <StatBox
                    label="Lit"
                    value={affinities.light}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.light - referenceAffinities.light
                        : undefined
                    }
                  />
                  <StatBox
                    label="Drk"
                    value={affinities.dark}
                    diff={
                      showDiff && referenceAffinities
                        ? affinities.dark - referenceAffinities.dark
                        : undefined
                    }
                  />
                </div>
              </>
            )}

            {/* Grip info */}
            {mode === "blade" && build.selectedGrip && (
              <p className="text-muted-foreground text-center text-xs">
                Grip: {build.selectedGrip}
              </p>
            )}
            {mode === "blade" && !build.selectedGrip && (
              <p className="text-muted-foreground text-center text-xs">
                Select a grip to see damage type stats and gem slots
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prompt when item selected but no material */}
      {mode && !build.selectedMaterial && (
        <p className="text-muted-foreground text-center text-sm">
          Select a material to see combined stats
        </p>
      )}
    </div>
  )
}

// ── Stat Box ─────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  diff,
}: {
  label: string
  value: number
  diff?: number
}) {
  return (
    <div className="bg-muted/50 flex min-w-11 flex-col items-center rounded px-2 py-1.5">
      <span className="text-muted-foreground text-xs leading-none">
        {label}
      </span>
      <span
        className={cn(
          "text-sm leading-tight font-medium",
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
            "text-xs leading-none font-medium",
            diff > 0 ? "text-green-400" : "text-red-400"
          )}
        >
          ({diff > 0 ? `+${diff}` : diff})
        </span>
      )}
    </div>
  )
}

// ── Grip Picker ──────────────────────────────────────────────────────

function GripPicker({
  grips,
  value,
  onSelect,
}: {
  grips: PickerItem[]
  value: string | null
  onSelect: (name: string | null) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">Grip</span>
      <ItemPicker
        items={grips}
        value={value}
        onSelect={onSelect}
        placeholder="Select grip..."
      />
    </div>
  )
}
