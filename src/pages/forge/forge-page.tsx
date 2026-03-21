import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RotateCcw } from "lucide-react"
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

export function ForgePage() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [selectedGrip, setSelectedGrip] = useState<string | null>(null)
  const [selectedGems, setSelectedGems] = useState<(string | null)[]>([])
  const [categoryFilter, setCategoryFilter] = useState("all")

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setSelectedItem(null)
    setSelectedMaterial(null)
    setSelectedGrip(null)
    setSelectedGems([])
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

  // Determine mode based on selected item
  const mode = selectedItem
    ? getModeForItem(selectedItem, bladeMap, armorMap)
    : null
  const availableMaterials = getMaterialsForMode(mode)

  // Get compatible grips for blade mode
  const compatibleGrips: PickerItem[] = useMemo(() => {
    if (mode !== "blade" || !selectedItem) return []
    const blade = bladeMap.get(selectedItem)
    if (!blade) return []
    const compatible = getCompatibleGrips(grips, blade.blade_type)
    return compatible.map((g, i) => ({
      name: fmt(g.field_name),
      type: g.grip_type,
      level: i + 1,
    }))
  }, [mode, selectedItem, bladeMap, grips])

  // Get available gem slots count
  const gemSlotCount = useMemo(() => {
    if (!selectedItem || !mode) return 0
    if (mode === "blade") {
      const grip = selectedGrip ? gripMap.get(selectedGrip) : null
      return grip?.gem_slots ?? 0
    }
    const armorItem = armorMap.get(selectedItem)
    return armorItem?.gem_slots ?? 0
  }, [selectedItem, selectedGrip, mode, gripMap, armorMap])

  // Filter gems by compatibility
  const availableGems = useMemo(() => {
    return gems.filter((g) => {
      if (mode === "blade")
        return g.gem_type === "Weapon" || g.gem_type === "Both"
      return g.gem_type === "Armor" || g.gem_type === "Both"
    })
  }, [gems, mode])

  // Sum selected gem stats
  const gemTotals = useMemo(() => {
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
  }, [selectedGems, gemMap])

  // Compute combined stats
  const combinedStats = useMemo(() => {
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
  }, [
    selectedItem,
    selectedMaterial,
    selectedGrip,
    mode,
    bladeMap,
    armorMap,
    gripMap,
    materialMap,
    gemTotals,
  ])

  function handleItemSelect(name: string | null) {
    setSelectedItem(name)
    setSelectedMaterial(null)
    setSelectedGrip(null)
    setSelectedGems([])
  }

  function handleGripSelect(name: string | null) {
    setSelectedGrip(name)
    setSelectedGems([])
  }

  function handleGemSelect(slotIndex: number, gemName: string | null) {
    setSelectedGems((prev) => {
      const next = [...prev]
      while (next.length <= slotIndex) next.push(null)
      next[slotIndex] = gemName
      return next
    })
  }

  function handleReset() {
    setSelectedItem(null)
    setSelectedMaterial(null)
    setSelectedGrip(null)
    setSelectedGems([])
    setCategoryFilter("all")
  }

  // Get display info for the selected item
  const selectedItemData = selectedItem
    ? (bladeMap.get(selectedItem) ?? armorMap.get(selectedItem))
    : null
  const selectedItemType = selectedItemData
    ? "blade_type" in selectedItemData
      ? selectedItemData.blade_type
      : selectedItemData.armor_type
    : undefined

  return (
    <div className="space-y-6">
      {/* Selection controls */}
      <div className="bg-card/50 border-border/50 space-y-4 rounded-xl border p-6">
        {/* Category filter + reset */}
        <div className="flex items-center justify-center gap-2">
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
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

        {/* Item picker */}
        <div className="mx-auto max-w-xl">
          <ItemPicker
            items={filteredItems}
            value={selectedItem}
            onSelect={handleItemSelect}
            placeholder="Search for a blade, armor, or shield..."
          />
        </div>

        {/* Material + Grip selects */}
        {mode && (
          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <MaterialSelect
                materials={availableMaterials}
                value={selectedMaterial}
                onSelect={setSelectedMaterial}
                label="Material"
              />
            </div>
            {mode === "blade" && (
              <div className="flex-1">
                <GripPicker
                  grips={compatibleGrips}
                  value={selectedGrip}
                  onSelect={handleGripSelect}
                />
              </div>
            )}
          </div>
        )}

        {/* Gem selectors */}
        {gemSlotCount > 0 && selectedMaterial && (
          <div className="mx-auto max-w-xl">
            <span className="text-muted-foreground mb-1 block text-xs font-medium">
              Gems ({gemSlotCount} slot{gemSlotCount !== 1 ? "s" : ""})
            </span>
            <div className="flex flex-col gap-2">
              {Array.from({ length: gemSlotCount }, (_, i) => (
                <Select
                  key={i}
                  value={selectedGems[i] ?? "__none__"}
                  onValueChange={(v) =>
                    handleGemSelect(i, v === "__none__" ? null : v)
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
              <span className="text-lg font-medium">{selectedItem}</span>
              {selectedMaterial && <MaterialBadge mat={selectedMaterial} />}
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
                  <StatBox label="STR" value={combinedStats.str} />
                  <StatBox label="INT" value={combinedStats.int} />
                  <StatBox label="AGI" value={combinedStats.agi} />
                  <StatBox label="RNG" value={combinedStats.range} />
                  <StatBox label="RSK" value={combinedStats.risk} />
                </div>

                {/* Damage type stats (from grip) */}
                {selectedGrip && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <StatBox label="Blt" value={combinedStats.blunt} />
                    <StatBox label="Edg" value={combinedStats.edged} />
                    <StatBox label="Prc" value={combinedStats.piercing} />
                  </div>
                )}

                {/* Gem slots */}
                {selectedGrip && (
                  <div className="flex justify-center">
                    <StatBox label="Gems" value={combinedStats.gem_slots} />
                  </div>
                )}
              </>
            )}

            {/* Armor/Shield stats */}
            {(combinedStats.mode === "armor" ||
              combinedStats.mode === "shield") && (
              <>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <StatBox label="STR" value={combinedStats.str} />
                  <StatBox label="INT" value={combinedStats.int} />
                  <StatBox label="AGI" value={combinedStats.agi} />
                </div>
                {combinedStats.gem_slots != null && (
                  <div className="flex justify-center">
                    <StatBox label="Gems" value={combinedStats.gem_slots} />
                  </div>
                )}
              </>
            )}

            {/* Affinities from material + gems */}
            {selectedMaterial &&
              (() => {
                const mat = materialMap.get(selectedMaterial)
                if (!mat) return null
                return (
                  <>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <StatBox
                        label="Hum"
                        value={mat.human + gemTotals.human}
                      />
                      <StatBox
                        label="Bst"
                        value={mat.beast + gemTotals.beast}
                      />
                      <StatBox
                        label="Und"
                        value={mat.undead + gemTotals.undead}
                      />
                      <StatBox
                        label="Phm"
                        value={mat.phantom + gemTotals.phantom}
                      />
                      <StatBox
                        label="Drg"
                        value={mat.dragon + gemTotals.dragon}
                      />
                      <StatBox label="Evl" value={mat.evil + gemTotals.evil} />
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <StatBox label="Phy" value={gemTotals.physical} />
                      <StatBox label="Fir" value={mat.fire + gemTotals.fire} />
                      <StatBox
                        label="Wat"
                        value={mat.water + gemTotals.water}
                      />
                      <StatBox label="Wnd" value={mat.wind + gemTotals.wind} />
                      <StatBox
                        label="Ear"
                        value={mat.earth + gemTotals.earth}
                      />
                      <StatBox
                        label="Lit"
                        value={mat.light + gemTotals.light}
                      />
                      <StatBox label="Drk" value={mat.dark + gemTotals.dark} />
                    </div>
                  </>
                )
              })()}

            {/* Grip info */}
            {mode === "blade" && selectedGrip && (
              <p className="text-muted-foreground text-center text-xs">
                Grip: {selectedGrip}
              </p>
            )}
            {mode === "blade" && !selectedGrip && (
              <p className="text-muted-foreground text-center text-xs">
                Select a grip to see damage type stats and gem slots
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prompt when item selected but no material */}
      {mode && !selectedMaterial && (
        <p className="text-muted-foreground text-center text-sm">
          Select a material to see combined stats
        </p>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
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
    </div>
  )
}

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
