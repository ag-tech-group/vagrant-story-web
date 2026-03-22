import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import { ArrowLeft, Package, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { MaterialBadge } from "@/components/stat-display"
import { useAuth } from "@/lib/auth"
import { loginUrl } from "@/lib/config"
import {
  gameApi,
  fmt,
  type Armor,
  type Blade,
  type Consumable,
  type Gem,
  type Grip,
  type Material,
} from "@/lib/game-api"
import {
  inventoryApi,
  type CreateInventoryItem,
  type EquipSlot,
  type InventoryItem,
} from "@/lib/inventory-api"
import { cn } from "@/lib/utils"

// ── Slot configuration ──────────────────────────────────────────────

interface SlotConfig {
  key: EquipSlot
  label: string
  gridArea: string
  itemTypes: string[]
  isBlade?: boolean
  isShield?: boolean
  isAccessory?: boolean
}

const EQUIP_SLOTS: SlotConfig[] = [
  {
    key: "right_hand",
    label: "R. Hand",
    gridArea: "rhand",
    itemTypes: ["blade"],
    isBlade: true,
  },
  { key: "head", label: "Head", gridArea: "head", itemTypes: ["Helm"] },
  {
    key: "accessory",
    label: "Accessory",
    gridArea: "accessory",
    itemTypes: ["Accessory"],
    isAccessory: true,
  },
  { key: "arms", label: "Arms", gridArea: "arms", itemTypes: ["Arm"] },
  { key: "body", label: "Body", gridArea: "body", itemTypes: ["Body"] },
  {
    key: "left_hand",
    label: "L. Hand",
    gridArea: "lhand",
    itemTypes: ["Shield"],
    isShield: true,
  },
  { key: "legs", label: "Legs", gridArea: "legs", itemTypes: ["Leg"] },
]

const BLADE_MATS = ["Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const ARMOR_MATS = ["Leather", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const SHIELD_MATS = ["Wood", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]

// ── Main component ──────────────────────────────────────────────────

export function InventoryDetailPage() {
  const { inventoryId } = useParams({ from: "/inventory/$inventoryId" })
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <div className="text-muted-foreground py-20 text-center text-sm">
        Loading...
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground text-sm">
          Sign in to manage your inventory
        </p>
        <Button asChild>
          <a href={loginUrl("/inventory")}>Sign In</a>
        </Button>
      </div>
    )
  }

  return <InventoryDetail inventoryId={Number(inventoryId)} />
}

function InventoryDetail({ inventoryId }: { inventoryId: number }) {
  const queryClient = useQueryClient()
  const [editingSlot, setEditingSlot] = useState<SlotConfig | null>(null)
  const [editingBagItem, setEditingBagItem] = useState(false)

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory", inventoryId],
    queryFn: () => inventoryApi.get(inventoryId),
  })

  // Fetch game data for building items
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
  const { data: consumables = [] } = useQuery({
    queryKey: ["consumables"],
    queryFn: gameApi.consumables,
  })

  const bladeMap = useMemo(() => {
    const map = new Map<string, Blade>()
    for (const b of blades) map.set(fmt(b.field_name), b)
    return map
  }, [blades])

  const bladeIdMap = useMemo(() => {
    const map = new Map<number, Blade>()
    for (const b of blades) map.set(b.id, b)
    return map
  }, [blades])

  const armorMap = useMemo(() => {
    const map = new Map<string, Armor>()
    for (const a of armor) map.set(fmt(a.field_name), a)
    return map
  }, [armor])

  const armorIdMap = useMemo(() => {
    const map = new Map<number, Armor>()
    for (const a of armor) map.set(a.id, a)
    return map
  }, [armor])

  const gripMap = useMemo(() => {
    const map = new Map<string, Grip>()
    for (const g of grips) map.set(fmt(g.field_name), g)
    return map
  }, [grips])

  const gripIdMap = useMemo(() => {
    const map = new Map<number, Grip>()
    for (const g of grips) map.set(g.id, g)
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

  const gemIdMap = useMemo(() => {
    const map = new Map<number, Gem>()
    for (const g of gems) map.set(g.id, g)
    return map
  }, [gems])

  const consumableMap = useMemo(() => {
    const map = new Map<string, Consumable>()
    for (const c of consumables) map.set(fmt(c.field_name), c)
    return map
  }, [consumables])

  const consumableIdMap = useMemo(() => {
    const map = new Map<number, Consumable>()
    for (const c of consumables) map.set(c.id, c)
    return map
  }, [consumables])

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: (item: CreateInventoryItem) =>
      inventoryApi.addItem(inventoryId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", inventoryId] })
      setEditingSlot(null)
      setEditingBagItem(false)
      toast.success("Item added")
    },
    onError: (err) => toast.error(String(err)),
  })

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      ...data
    }: { itemId: number } & Record<string, unknown>) =>
      inventoryApi.updateItem(inventoryId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", inventoryId] })
      setEditingSlot(null)
      toast.success("Item updated")
    },
    onError: (err) => toast.error(String(err)),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) =>
      inventoryApi.deleteItem(inventoryId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", inventoryId] })
      toast.success("Item removed")
    },
    onError: (err) => toast.error(String(err)),
  })

  // Get item in a specific slot
  const getSlotItem = useCallback(
    (slot: EquipSlot): InventoryItem | undefined =>
      inventory?.items.find((i) => i.equip_slot === slot),
    [inventory]
  )

  // Check if equipped blade is 2H (blocks left_hand shield)
  const equippedBladeIs2H = useMemo(() => {
    const rhItem = inventory?.items.find((i) => i.equip_slot === "right_hand")
    if (!rhItem || rhItem.item_type !== "blade") return false
    const blade = bladeIdMap.get(rhItem.item_id)
    return blade?.hands === "2H"
  }, [inventory, bladeIdMap])

  // All items for the bag view (equipped items shown with badge)
  const allItems = useMemo(() => inventory?.items ?? [], [inventory])

  // Get display info for an inventory item
  const getItemDisplayName = useCallback(
    (item: InventoryItem): string => {
      if (item.item_type === "blade") {
        const blade = bladeIdMap.get(item.item_id)
        return blade ? fmt(blade.field_name) : `Blade #${item.item_id}`
      }
      if (item.item_type === "grip") {
        const grip = gripIdMap.get(item.item_id)
        return grip ? fmt(grip.field_name) : `Grip #${item.item_id}`
      }
      if (item.item_type === "gem") {
        const gem = gemIdMap.get(item.item_id)
        return gem ? fmt(gem.field_name) : `Gem #${item.item_id}`
      }
      if (item.item_type === "consumable") {
        const consumable = consumableIdMap.get(item.item_id)
        return consumable
          ? fmt(consumable.field_name)
          : `Consumable #${item.item_id}`
      }
      const armorItem = armorIdMap.get(item.item_id)
      return armorItem ? fmt(armorItem.field_name) : `Item #${item.item_id}`
    },
    [bladeIdMap, armorIdMap, gripIdMap, gemIdMap, consumableIdMap]
  )

  const getItemDisplayType = useCallback(
    (item: InventoryItem): string => {
      if (item.item_type === "blade") {
        const blade = bladeIdMap.get(item.item_id)
        return blade?.blade_type ?? "Blade"
      }
      if (item.item_type === "grip") {
        const grip = gripIdMap.get(item.item_id)
        return grip?.grip_type ?? "Grip"
      }
      if (item.item_type === "gem") {
        const gem = gemIdMap.get(item.item_id)
        return gem?.gem_type ?? "Gem"
      }
      if (item.item_type === "consumable") {
        return "Consumable"
      }
      const armorItem = armorIdMap.get(item.item_id)
      return armorItem?.armor_type ?? "Armor"
    },
    [bladeIdMap, armorIdMap, gripIdMap, gemIdMap]
  )

  // Determine the equip slot for an item (null = not equippable)
  const getEquipSlotForItem = useCallback(
    (item: InventoryItem): EquipSlot | null => {
      if (item.item_type === "blade") return "right_hand"
      if (item.item_type === "armor") {
        const armorItem = armorIdMap.get(item.item_id)
        if (!armorItem) return null
        const slotMap: Record<string, EquipSlot> = {
          Helm: "head",
          Body: "body",
          Leg: "legs",
          Arm: "arms",
          Shield: "left_hand",
          Accessory: "accessory",
        }
        return slotMap[armorItem.armor_type] ?? null
      }
      return null
    },
    [armorIdMap]
  )

  // Handle slot save
  const handleSlotSave = useCallback(
    (data: CreateInventoryItem, existingItemId?: number) => {
      if (existingItemId) {
        updateItemMutation.mutate({
          itemId: existingItemId,
          ...data,
        })
      } else {
        addItemMutation.mutate(data)
      }
    },
    [addItemMutation, updateItemMutation]
  )

  // Handle bag item save
  const handleBagSave = useCallback(
    (data: CreateInventoryItem) => {
      addItemMutation.mutate(data)
    },
    [addItemMutation]
  )

  // Compute combined stats
  const combinedStats = useMemo(() => {
    if (!inventory) return null

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

    let bladeRange = 0
    let bladeRisk = 0
    let bladeDamageType = ""
    let gripBlunt = 0
    let gripEdged = 0
    let gripPiercing = 0
    let hasBlade = false

    for (const item of inventory.items) {
      if (!item.equip_slot) continue

      if (item.item_type === "blade") {
        const blade = bladeIdMap.get(item.item_id)
        if (!blade) continue
        hasBlade = true
        const mat = item.material ? materialMap.get(item.material) : null

        totals.str += blade.str + (mat?.blade_str ?? 0)
        totals.int += blade.int + (mat?.blade_int ?? 0)
        totals.agi += blade.agi + (mat?.blade_agi ?? 0)
        bladeRange = blade.range
        bladeRisk = blade.risk
        bladeDamageType = blade.damage_type

        if (mat) {
          totals.human += mat.human
          totals.beast += mat.beast
          totals.undead += mat.undead
          totals.phantom += mat.phantom
          totals.dragon += mat.dragon
          totals.evil += mat.evil
          totals.fire += mat.fire
          totals.water += mat.water
          totals.wind += mat.wind
          totals.earth += mat.earth
          totals.light += mat.light
          totals.dark += mat.dark
        }

        // Grip stats
        const grip = item.grip_id ? gripIdMap.get(item.grip_id) : null
        if (grip) {
          totals.str += grip.str
          totals.int += grip.int
          totals.agi += grip.agi
          gripBlunt = grip.blunt
          gripEdged = grip.edged
          gripPiercing = grip.piercing
        }

        // Grip gems
        for (const gemId of [item.gem_1_id, item.gem_2_id, item.gem_3_id]) {
          if (!gemId) continue
          const gem = gemIdMap.get(gemId)
          if (!gem) continue
          totals.str += gem.str
          totals.int += gem.int
          totals.agi += gem.agi
          totals.human += gem.human
          totals.beast += gem.beast
          totals.undead += gem.undead
          totals.phantom += gem.phantom
          totals.dragon += gem.dragon
          totals.evil += gem.evil
          totals.physical += gem.physical
          totals.fire += gem.fire
          totals.water += gem.water
          totals.wind += gem.wind
          totals.earth += gem.earth
          totals.light += gem.light
          totals.dark += gem.dark
        }
      } else {
        // armor / shield / accessory
        const armorItem = armorIdMap.get(item.item_id)
        if (!armorItem) continue

        const isShield = armorItem.armor_type === "Shield"
        const isAccessory = armorItem.armor_type === "Accessory"
        const mat = item.material ? materialMap.get(item.material) : null

        if (isAccessory) {
          totals.str += armorItem.str
          totals.int += armorItem.int
          totals.agi += armorItem.agi
        } else if (isShield) {
          totals.str += armorItem.str + (mat?.shield_str ?? 0)
          totals.int += armorItem.int + (mat?.shield_int ?? 0)
          totals.agi += armorItem.agi + (mat?.shield_agi ?? 0)
        } else {
          totals.str += armorItem.str + (mat?.armor_str ?? 0)
          totals.int += armorItem.int + (mat?.armor_int ?? 0)
          totals.agi += armorItem.agi + (mat?.armor_agi ?? 0)
        }

        if (mat && !isAccessory) {
          totals.human += mat.human
          totals.beast += mat.beast
          totals.undead += mat.undead
          totals.phantom += mat.phantom
          totals.dragon += mat.dragon
          totals.evil += mat.evil
          totals.fire += mat.fire
          totals.water += mat.water
          totals.wind += mat.wind
          totals.earth += mat.earth
          totals.light += mat.light
          totals.dark += mat.dark
        }

        // Shield gems
        if (isShield) {
          for (const gemId of [item.gem_1_id, item.gem_2_id, item.gem_3_id]) {
            if (!gemId) continue
            const gem = gemIdMap.get(gemId)
            if (!gem) continue
            totals.str += gem.str
            totals.int += gem.int
            totals.agi += gem.agi
            totals.human += gem.human
            totals.beast += gem.beast
            totals.undead += gem.undead
            totals.phantom += gem.phantom
            totals.dragon += gem.dragon
            totals.evil += gem.evil
            totals.physical += gem.physical
            totals.fire += gem.fire
            totals.water += gem.water
            totals.wind += gem.wind
            totals.earth += gem.earth
            totals.light += gem.light
            totals.dark += gem.dark
          }
        }
      }
    }

    return {
      ...totals,
      range: bladeRange,
      risk: bladeRisk,
      damage_type: bladeDamageType,
      blunt: gripBlunt,
      edged: gripEdged,
      piercing: gripPiercing,
      hasBlade,
    }
  }, [inventory, bladeIdMap, armorIdMap, gripIdMap, materialMap, gemIdMap])

  if (isLoading || !inventory) {
    return (
      <div className="text-muted-foreground py-10 text-center text-sm">
        Loading inventory...
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/inventory">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <h2 className="text-lg font-medium">{inventory.name}</h2>
      </div>

      {/* Equipment Grid */}
      <div className="mx-auto max-w-md">
        <EquipmentGrid
          getSlotItem={getSlotItem}
          getItemDisplayName={getItemDisplayName}
          getItemDisplayType={getItemDisplayType}
          onSlotClick={setEditingSlot}
          onUnequip={(slotItem) =>
            updateItemMutation.mutate({
              itemId: slotItem.id,
              equip_slot: null,
            })
          }
          equippedBladeIs2H={equippedBladeIs2H}
        />
      </div>

      {/* Combined Stats */}
      {combinedStats && inventory.items.some((i) => i.equip_slot != null) && (
        <CombinedStatsCard stats={combinedStats} />
      )}

      {/* Item Bag */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            <Package className="mr-1.5 inline size-4" />
            Item Bag ({allItems.length})
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingBagItem(true)}
          >
            <Plus className="size-3.5" />
            Add Item
          </Button>
        </div>
        {allItems.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No items in the bag
          </p>
        ) : (
          <div className="space-y-1">
            {allItems.map((item) => {
              const targetSlot = !item.equip_slot
                ? getEquipSlotForItem(item)
                : null
              return (
                <BagItemRow
                  key={item.id}
                  item={item}
                  name={getItemDisplayName(item)}
                  type={getItemDisplayType(item)}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
                  onUnequip={
                    item.equip_slot
                      ? () =>
                          updateItemMutation.mutate({
                            itemId: item.id,
                            equip_slot: null,
                          })
                      : undefined
                  }
                  onEquip={
                    targetSlot
                      ? () =>
                          updateItemMutation.mutate({
                            itemId: item.id,
                            equip_slot: targetSlot,
                          })
                      : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Slot Editor Dialog */}
      {editingSlot && (
        <SlotEditorDialog
          slot={editingSlot}
          existingItem={getSlotItem(editingSlot.key)}
          blades={blades}
          armor={armor}
          grips={grips}
          gems={gems}
          consumables={consumables}
          bladeMap={bladeMap}
          bladeIdMap={bladeIdMap}
          armorMap={armorMap}
          armorIdMap={armorIdMap}
          gripMap={gripMap}
          gripIdMap={gripIdMap}
          gemMap={gemMap}
          gemIdMap={gemIdMap}
          consumableMap={consumableMap}
          consumableIdMap={consumableIdMap}
          onSave={handleSlotSave}
          onUnequip={
            getSlotItem(editingSlot.key)
              ? () => {
                  const item = getSlotItem(editingSlot.key)!
                  updateItemMutation.mutate(
                    { itemId: item.id, equip_slot: null },
                    { onSuccess: () => setEditingSlot(null) }
                  )
                }
              : undefined
          }
          onClose={() => setEditingSlot(null)}
          isPending={addItemMutation.isPending || updateItemMutation.isPending}
        />
      )}

      {/* Bag Item Editor Dialog */}
      {editingBagItem && (
        <SlotEditorDialog
          slot={null}
          existingItem={undefined}
          blades={blades}
          armor={armor}
          grips={grips}
          gems={gems}
          consumables={consumables}
          bladeMap={bladeMap}
          bladeIdMap={bladeIdMap}
          armorMap={armorMap}
          armorIdMap={armorIdMap}
          gripMap={gripMap}
          gripIdMap={gripIdMap}
          gemMap={gemMap}
          gemIdMap={gemIdMap}
          consumableMap={consumableMap}
          consumableIdMap={consumableIdMap}
          onSave={handleBagSave}
          onClose={() => setEditingBagItem(false)}
          isPending={addItemMutation.isPending}
        />
      )}
    </div>
  )
}

// ── Equipment Grid ──────────────────────────────────────────────────

function EquipmentGrid({
  getSlotItem,
  getItemDisplayName,
  getItemDisplayType,
  onSlotClick,
  onUnequip,
  equippedBladeIs2H,
}: {
  getSlotItem: (slot: EquipSlot) => InventoryItem | undefined
  getItemDisplayName: (item: InventoryItem) => string
  getItemDisplayType: (item: InventoryItem) => string
  onSlotClick: (slot: SlotConfig) => void
  onUnequip: (item: InventoryItem) => void
  equippedBladeIs2H: boolean
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateAreas: `
          "rhand    head      accessory"
          "arms     body      lhand"
          ".        legs      ."
        `,
      }}
    >
      {EQUIP_SLOTS.map((slot) => {
        const item = getSlotItem(slot.key)
        const disabled = slot.key === "left_hand" && equippedBladeIs2H
        return (
          <div key={slot.key} style={{ gridArea: slot.gridArea }}>
            <EquipSlotCard
              slot={slot}
              item={item}
              displayName={item ? getItemDisplayName(item) : undefined}
              displayType={item ? getItemDisplayType(item) : undefined}
              onClick={() => !disabled && onSlotClick(slot)}
              onClear={item ? () => onUnequip(item) : undefined}
              disabled={disabled}
            />
          </div>
        )
      })}
    </div>
  )
}

function EquipSlotCard({
  slot,
  item,
  displayName,
  displayType,
  onClick,
  onClear,
  disabled,
}: {
  slot: SlotConfig
  item?: InventoryItem
  displayName?: string
  displayType?: string
  onClick: () => void
  onClear?: () => void
  disabled?: boolean
}) {
  if (!item) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-3 transition-colors",
          disabled
            ? "border-border/30 cursor-not-allowed opacity-40"
            : "border-border/50 hover:border-foreground/30 hover:bg-muted/30"
        )}
      >
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {slot.label}
        </span>
        {disabled ? (
          <span className="text-muted-foreground text-[9px]">2H equipped</span>
        ) : (
          <Plus className="text-muted-foreground/50 size-5" />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:border-foreground/30 group bg-card/50 relative flex h-full w-full flex-col items-center gap-1 rounded-lg border p-2 transition-colors"
    >
      <ItemIcon type={displayType} size="sm" />
      <span className="max-w-full truncate text-xs leading-tight font-medium">
        {displayName}
      </span>
      {item.material && <MaterialBadge mat={item.material} />}
      {onClear && (
        <span
          role="button"
          tabIndex={0}
          className="text-muted-foreground hover:text-destructive absolute top-1 right-1 hidden group-hover:block"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation()
              onClear()
            }
          }}
        >
          <span
            className="size-3.5 bg-current"
            style={{
              mask: "url(/images/icons/Unequip.svg) center / contain no-repeat",
              WebkitMask:
                "url(/images/icons/Unequip.svg) center / contain no-repeat",
            }}
          />
        </span>
      )}
    </button>
  )
}

// ── Bag Item Row ────────────────────────────────────────────────────

const SLOT_LABELS: Record<string, string> = {
  right_hand: "R. Hand",
  left_hand: "L. Hand",
  head: "Head",
  body: "Body",
  legs: "Legs",
  arms: "Arms",
  accessory: "Accessory",
}

function BagItemRow({
  item,
  name,
  type,
  onDelete,
  onUnequip,
  onEquip,
}: {
  item: InventoryItem
  name: string
  type: string
  onDelete: () => void
  onUnequip?: () => void
  onEquip?: () => void
}) {
  return (
    <div className="border-border/50 flex items-center gap-3 rounded-lg border px-3 py-2">
      <ItemIcon type={type} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{name}</p>
          {item.equip_slot && (
            <span className="bg-primary/15 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold">
              {SLOT_LABELS[item.equip_slot] ?? "Equipped"}
            </span>
          )}
        </div>
        {item.material && <MaterialBadge mat={item.material} />}
      </div>
      {item.quantity > 1 && (
        <span className="text-muted-foreground text-xs">x{item.quantity}</span>
      )}
      {onEquip && (
        <Button
          variant="ghost"
          size="sm"
          className="text-primary shrink-0"
          onClick={onEquip}
        >
          <span
            className="bg-primary size-3.5"
            style={{
              mask: "url(/images/icons/Equip.svg) center / contain no-repeat",
              WebkitMask:
                "url(/images/icons/Equip.svg) center / contain no-repeat",
            }}
          />
          Equip
        </Button>
      )}
      {onUnequip && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={onUnequip}
        >
          <span
            className="size-3.5 bg-current"
            style={{
              mask: "url(/images/icons/Unequip.svg) center / contain no-repeat",
              WebkitMask:
                "url(/images/icons/Unequip.svg) center / contain no-repeat",
            }}
          />
          Unequip
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive shrink-0"
        title="Delete"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

// ── Combined Stats Card ─────────────────────────────────────────────

function CombinedStatsCard({
  stats,
}: {
  stats: {
    str: number
    int: number
    agi: number
    range: number
    risk: number
    damage_type: string
    blunt: number
    edged: number
    piercing: number
    human: number
    beast: number
    undead: number
    phantom: number
    dragon: number
    evil: number
    physical: number
    fire: number
    water: number
    wind: number
    earth: number
    light: number
    dark: number
    hasBlade: boolean
  }
}) {
  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-center text-xs font-semibold tracking-wider uppercase">
          Combined Stats
        </p>

        {/* Core stats */}
        <div className="flex flex-wrap justify-center gap-1.5">
          <StatBox label="STR" value={stats.str} />
          <StatBox label="INT" value={stats.int} />
          <StatBox label="AGI" value={stats.agi} />
          {stats.hasBlade && (
            <>
              <StatBox label="RNG" value={stats.range} />
              <StatBox label="RSK" value={stats.risk} />
            </>
          )}
        </div>

        {/* Damage type stats */}
        {stats.hasBlade && (stats.blunt || stats.edged || stats.piercing) ? (
          <div className="flex flex-wrap justify-center gap-1.5">
            <StatBox label="Blt" value={stats.blunt} />
            <StatBox label="Edg" value={stats.edged} />
            <StatBox label="Prc" value={stats.piercing} />
          </div>
        ) : null}

        {/* Class affinities */}
        <div className="flex flex-wrap justify-center gap-1.5">
          <StatBox label="Hum" value={stats.human} />
          <StatBox label="Bst" value={stats.beast} />
          <StatBox label="Und" value={stats.undead} />
          <StatBox label="Phm" value={stats.phantom} />
          <StatBox label="Drg" value={stats.dragon} />
          <StatBox label="Evl" value={stats.evil} />
        </div>

        {/* Elemental affinities */}
        <div className="flex flex-wrap justify-center gap-1.5">
          <StatBox label="Phy" value={stats.physical} />
          <StatBox label="Fir" value={stats.fire} />
          <StatBox label="Wat" value={stats.water} />
          <StatBox label="Wnd" value={stats.wind} />
          <StatBox label="Ear" value={stats.earth} />
          <StatBox label="Lit" value={stats.light} />
          <StatBox label="Drk" value={stats.dark} />
        </div>
      </CardContent>
    </Card>
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

// ── Slot Editor Dialog ──────────────────────────────────────────────

function bladeTypeToCompatible(bladeType: string): string {
  if (bladeType === "Axe / Mace") return "Axe/Mace"
  return bladeType
}

function getCompatibleGrips(allGrips: Grip[], bladeType: string): Grip[] {
  const compatKey = bladeTypeToCompatible(bladeType)
  return allGrips.filter((g) => {
    const weapons = g.compatible_weapons.split("/")
    return weapons.includes(compatKey)
  })
}

function SlotEditorDialog({
  slot,
  existingItem,
  blades,
  armor,
  grips,
  gems,
  consumables,
  bladeMap,
  bladeIdMap,
  armorMap,
  armorIdMap,
  gripMap,
  gripIdMap,
  gemMap,
  gemIdMap,
  consumableMap,
  consumableIdMap,
  onSave,
  onUnequip,
  onClose,
  isPending,
}: {
  slot: SlotConfig | null
  existingItem?: InventoryItem
  blades: Blade[]
  armor: Armor[]
  grips: Grip[]
  gems: Gem[]
  consumables: Consumable[]
  bladeMap: Map<string, Blade>
  bladeIdMap: Map<number, Blade>
  armorMap: Map<string, Armor>
  armorIdMap: Map<number, Armor>
  gripMap: Map<string, Grip>
  gripIdMap: Map<number, Grip>
  gemMap: Map<string, Gem>
  gemIdMap: Map<number, Gem>
  consumableMap: Map<string, Consumable>
  consumableIdMap: Map<number, Consumable>
  onSave: (data: CreateInventoryItem, existingItemId?: number) => void
  onUnequip?: () => void
  onClose: () => void
  isPending: boolean
}) {
  // Resolve existing item names for pre-fill
  const initialItemName = useMemo(() => {
    if (!existingItem) return null
    if (existingItem.item_type === "blade") {
      const b = bladeIdMap.get(existingItem.item_id)
      return b ? fmt(b.field_name) : null
    }
    if (existingItem.item_type === "grip") {
      const g = gripIdMap.get(existingItem.item_id)
      return g ? fmt(g.field_name) : null
    }
    if (existingItem.item_type === "gem") {
      const g = gemIdMap.get(existingItem.item_id)
      return g ? fmt(g.field_name) : null
    }
    if (existingItem.item_type === "consumable") {
      const c = consumableIdMap.get(existingItem.item_id)
      return c ? fmt(c.field_name) : null
    }
    const a = armorIdMap.get(existingItem.item_id)
    return a ? fmt(a.field_name) : null
  }, [
    existingItem,
    bladeIdMap,
    armorIdMap,
    gripIdMap,
    gemIdMap,
    consumableIdMap,
  ])

  const initialGripName = useMemo(() => {
    if (!existingItem?.grip_id) return null
    const g = gripIdMap.get(existingItem.grip_id)
    return g ? fmt(g.field_name) : null
  }, [existingItem, gripIdMap])

  const initialGems = useMemo(() => {
    if (!existingItem) return []
    const ids = [
      existingItem.gem_1_id,
      existingItem.gem_2_id,
      existingItem.gem_3_id,
    ]
    return ids.map((id) => {
      if (!id) return null
      const g = gemIdMap.get(id)
      return g ? fmt(g.field_name) : null
    })
  }, [existingItem, gemIdMap])

  const [selectedItem, setSelectedItem] = useState<string | null>(
    initialItemName
  )
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(
    existingItem?.material ?? null
  )
  const [selectedGrip, setSelectedGrip] = useState<string | null>(
    initialGripName
  )
  const [selectedGems, setSelectedGems] =
    useState<(string | null)[]>(initialGems)

  // Build picker items based on slot type
  const pickerItems: PickerItem[] = useMemo(() => {
    const items: PickerItem[] = []

    if (!slot) {
      for (const b of blades) {
        items.push({
          name: fmt(b.field_name),
          type: b.blade_type,
          level: b.game_id,
          suffix: b.hands,
        })
      }
      for (const a of armor) {
        items.push({
          name: fmt(a.field_name),
          type: a.armor_type,
          level: a.game_id,
        })
      }
      for (const g of grips) {
        items.push({
          name: fmt(g.field_name),
          type: g.grip_type || "Grip",
          level: g.game_id,
        })
      }
      for (const g of gems) {
        items.push({
          name: fmt(g.field_name),
          type: g.gem_type || "Gem",
          level: g.game_id,
        })
      }
      for (const c of consumables) {
        items.push({
          name: fmt(c.field_name),
          type: "Consumable",
          level: c.game_id,
        })
      }
      return items
    }

    if (slot.isBlade) {
      for (const b of blades) {
        items.push({
          name: fmt(b.field_name),
          type: b.blade_type,
          level: b.game_id,
          suffix: b.hands,
        })
      }
    } else if (slot.isShield) {
      for (const a of armor) {
        if (a.armor_type === "Shield") {
          items.push({
            name: fmt(a.field_name),
            type: "Shield",
            level: a.game_id,
          })
        }
      }
    } else if (slot.isAccessory) {
      for (const a of armor) {
        if (a.armor_type === "Accessory") {
          items.push({
            name: fmt(a.field_name),
            type: "Accessory",
            level: a.game_id,
          })
        }
      }
    } else {
      for (const a of armor) {
        if (slot.itemTypes.includes(a.armor_type)) {
          items.push({
            name: fmt(a.field_name),
            type: a.armor_type,
            level: a.game_id,
          })
        }
      }
    }

    return items
  }, [slot, blades, armor, grips, gems, consumables])

  // Determine mode of selected item
  const isBlade = selectedItem ? bladeMap.has(selectedItem) : false
  const isGrip = selectedItem && !isBlade ? gripMap.has(selectedItem) : false
  const isGem =
    selectedItem && !isBlade && !isGrip ? gemMap.has(selectedItem) : false
  const isConsumable =
    selectedItem && !isBlade && !isGrip && !isGem
      ? consumableMap.has(selectedItem)
      : false
  const isShield =
    selectedItem && !isBlade && !isGrip && !isGem && !isConsumable
      ? armorMap.get(selectedItem)?.armor_type === "Shield"
      : false
  const isAccessory =
    selectedItem && !isBlade && !isGrip && !isGem && !isConsumable
      ? armorMap.get(selectedItem)?.armor_type === "Accessory"
      : false

  const needsMaterial = !isAccessory && !isGrip && !isGem && !isConsumable

  // Materials
  const availableMaterials = useMemo(() => {
    if (!selectedItem || !needsMaterial) return []
    if (isBlade) return BLADE_MATS
    if (isShield) return SHIELD_MATS
    return ARMOR_MATS
  }, [selectedItem, needsMaterial, isBlade, isShield])

  // Compatible grips (blade only)
  const compatibleGripItems: PickerItem[] = useMemo(() => {
    if (!isBlade || !selectedItem) return []
    const blade = bladeMap.get(selectedItem)
    if (!blade) return []
    const compatible = getCompatibleGrips(grips, blade.blade_type)
    return compatible.map((g, i) => ({
      name: fmt(g.field_name),
      type: g.grip_type,
      level: i + 1,
    }))
  }, [isBlade, selectedItem, bladeMap, grips])

  // Gem slots count
  const gemSlotCount = useMemo(() => {
    if (!selectedItem) return 0
    if (isBlade) {
      const grip = selectedGrip ? gripMap.get(selectedGrip) : null
      return grip?.gem_slots ?? 0
    }
    if (isShield) {
      const shield = armorMap.get(selectedItem)
      return shield?.gem_slots ?? 0
    }
    return 0
  }, [selectedItem, isBlade, isShield, selectedGrip, gripMap, armorMap])

  // Available gems (weapon vs armor type)
  const availableGems = useMemo(() => {
    return gems.filter((g) => {
      if (isBlade) return g.gem_type === "Weapon" || g.gem_type === "Both"
      return g.gem_type === "Armor" || g.gem_type === "Both"
    })
  }, [gems, isBlade])

  const handleItemSelect = (name: string | null) => {
    setSelectedItem(name)
    setSelectedMaterial(null)
    setSelectedGrip(null)
    setSelectedGems([])
  }

  const handleGripSelect = (name: string | null) => {
    setSelectedGrip(name)
    setSelectedGems([])
  }

  const handleGemSelect = (index: number, gemName: string | null) => {
    setSelectedGems((prev) => {
      const next = [...prev]
      while (next.length <= index) next.push(null)
      next[index] = gemName
      return next
    })
  }

  const handleConfirm = () => {
    if (!selectedItem) return

    let item_type: string
    let item_id: number

    if (bladeMap.has(selectedItem)) {
      item_type = "blade"
      item_id = bladeMap.get(selectedItem)!.id
    } else if (gripMap.has(selectedItem)) {
      item_type = "grip"
      item_id = gripMap.get(selectedItem)!.id
    } else if (gemMap.has(selectedItem)) {
      item_type = "gem"
      item_id = gemMap.get(selectedItem)!.id
    } else if (consumableMap.has(selectedItem)) {
      item_type = "consumable"
      item_id = consumableMap.get(selectedItem)!.id
    } else {
      item_type = "armor"
      item_id = armorMap.get(selectedItem)!.id
    }

    const grip = selectedGrip ? gripMap.get(selectedGrip) : null

    const gemIds = selectedGems.map((name) => {
      if (!name) return null
      const gem = gems.find((g) => fmt(g.field_name) === name)
      return gem?.id ?? null
    })

    const data: CreateInventoryItem = {
      item_type,
      item_id,
      material: needsMaterial ? selectedMaterial || null : null,
      grip_id: grip?.id ?? null,
      gem_1_id: gemIds[0] ?? null,
      gem_2_id: gemIds[1] ?? null,
      gem_3_id: gemIds[2] ?? null,
      equip_slot: slot?.key ?? null,
    }

    onSave(data, existingItem?.id)
  }

  const canConfirm = useMemo(() => {
    if (!selectedItem) return false
    if (needsMaterial && availableMaterials.length > 0 && !selectedMaterial)
      return false
    return true
  }, [selectedItem, needsMaterial, availableMaterials, selectedMaterial])

  const isEditing = !!existingItem

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit: ${slot?.label ?? "Bag Item"}`
              : slot
                ? `Equip: ${slot.label}`
                : "Add to Bag"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the item for ${slot ? `the ${slot.label.toLowerCase()} slot` : "your bag"}`
              : slot
                ? `Select an item for the ${slot.label.toLowerCase()} slot`
                : "Select an item to add to your bag"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item picker */}
          <ItemPicker
            items={pickerItems}
            value={selectedItem}
            onSelect={handleItemSelect}
            placeholder={
              slot?.isBlade
                ? "Select a blade..."
                : slot?.isShield
                  ? "Select a shield..."
                  : slot?.isAccessory
                    ? "Select an accessory..."
                    : slot
                      ? `Select ${slot.label.toLowerCase()} armor...`
                      : "Select any item..."
            }
          />

          {/* Material */}
          {selectedItem && availableMaterials.length > 0 && (
            <MaterialSelect
              materials={availableMaterials}
              value={selectedMaterial}
              onSelect={setSelectedMaterial}
              label="Material"
            />
          )}

          {/* Grip (blade only) */}
          {isBlade && selectedMaterial && (
            <div>
              <ItemPicker
                items={compatibleGripItems}
                value={selectedGrip}
                onSelect={handleGripSelect}
                placeholder="Select grip..."
                label="Grip"
              />
            </div>
          )}

          {/* Gems */}
          {gemSlotCount > 0 && selectedMaterial && (
            <div>
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
                    <SelectTrigger className="h-auto min-h-10 w-full py-2">
                      <SelectValue placeholder={`Slot ${i + 1} - empty`} />
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {onUnequip && (
            <Button
              variant="outline"
              className="text-muted-foreground hover:text-destructive"
              disabled={isPending}
              onClick={onUnequip}
            >
              <span
                className="size-3.5 bg-current"
                style={{
                  mask: "url(/images/icons/Unequip.svg) center / contain no-repeat",
                  WebkitMask:
                    "url(/images/icons/Unequip.svg) center / contain no-repeat",
                }}
              />
              Unequip
            </Button>
          )}
          <Button onClick={handleConfirm} disabled={!canConfirm || isPending}>
            {isPending
              ? "Saving..."
              : isEditing
                ? "Update"
                : slot
                  ? "Equip"
                  : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
