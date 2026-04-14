import { useCallback, useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getRouteApi,
  Link,
  useMatchRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router"
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Package,
  Plus,
  Search,
  Swords,
  Trash2,
  X,
} from "lucide-react"
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
import { Input } from "@/components/ui/input"
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
import { StatBox } from "@/components/inventory-preview"
import {
  EQUIP_SLOTS,
  SLOT_LABELS,
  DISPLAY_TYPE_TO_CATEGORY,
  type SlotConfig,
} from "@/lib/inventory-constants"
import { CraftingTab } from "@/pages/inventory/crafting-tab"
import { LoadoutTab } from "@/pages/inventory/loadout-tab"
import { cn } from "@/lib/utils"

// ── Slot configuration ──────────────────────────────────────────────

// Game limits per section (bag / container)
const BAG_LIMITS: Record<string, number> = {
  Blade: 16,
  Grip: 16,
  Shield: 8,
  Armor: 16, // shared: Helm + Body + Leg + Arm
  Gem: 48,
  Accessory: 16,
  Consumable: 64,
}
const CONTAINER_LIMITS: Record<string, number> = {
  Blade: 64,
  Grip: 64,
  Shield: 32,
  Armor: 64, // shared: Helm + Body + Leg + Arm
  Gem: 192,
  Accessory: 64,
  Consumable: 256,
}
// Armor sub-types share one pool
const ARMOR_POOL_TYPES = new Set(["Helm", "Body", "Leg", "Arm"])

const BLADE_MATS = ["Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const ARMOR_MATS = ["Leather", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const SHIELD_MATS = ["Wood", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]

// ── Main component ──────────────────────────────────────────────────

export function InventoryDetailPage() {
  const { inventoryId } = useParams({ strict: false }) as {
    inventoryId: string
  }
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

type BagSort = "equipped" | "added" | "name"

const inventoryRouteApi = getRouteApi("/inventory/$inventoryId")

function InventoryDetail({ inventoryId }: { inventoryId: number }) {
  const queryClient = useQueryClient()
  const matchRoute = useMatchRoute()
  const search = inventoryRouteApi.useSearch()
  const navigate = useNavigate()
  const activeTab = matchRoute({
    to: "/inventory/$inventoryId/loadout",
    params: { inventoryId: String(inventoryId) },
  })
    ? "loadout"
    : matchRoute({
          to: "/inventory/$inventoryId/workbench",
          params: { inventoryId: String(inventoryId) },
        })
      ? "workbench"
      : "equipment"

  // Route search-param updates back to the active subroute explicitly.
  // A route-bound navigate on the parent would resolve to /inventory/$inventoryId,
  // whose index redirects to /equipment — silently kicking users off workbench/loadout.
  const updateSearch = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const to =
        activeTab === "loadout"
          ? "/inventory/$inventoryId/loadout"
          : activeTab === "workbench"
            ? "/inventory/$inventoryId/workbench"
            : "/inventory/$inventoryId/equipment"
      navigate({
        to,
        params: { inventoryId: String(inventoryId) },
        search: (prev) => {
          const next: Record<string, unknown> = { ...prev, ...updates }
          for (const key of Object.keys(next)) {
            if (next[key] === undefined || next[key] === "") delete next[key]
          }
          return next
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, activeTab, inventoryId]
  )
  // Track which tabs have been visited so their state survives tab switches.
  // Each tab stays mounted after first visit and is hidden via `hidden` while
  // inactive — unmounting would discard search results, filter toggles, and
  // analyze output the user cares about. Updating state during render (the
  // React-supported "adjust state on prop change" pattern) converges in one
  // extra pass and avoids the `setState-in-effect` and `refs-in-render` rules.
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(
    () => new Set([activeTab])
  )
  if (!mountedTabs.has(activeTab)) {
    setMountedTabs(new Set(mountedTabs).add(activeTab))
  }
  const [editingSlot, setEditingSlot] = useState<SlotConfig | null>(null)
  const [editingBagItem, setEditingBagItem] = useState(false)
  const [bagSearch, setBagSearch] = useState("")
  const bagSort = (search.sort as BagSort) ?? "equipped"
  const setBagSort = (v: BagSort) =>
    updateSearch({ sort: v === "equipped" ? undefined : v })
  const bagCategory = search.cat ?? "all"
  const setBagCategory = (v: string) =>
    updateSearch({ cat: v === "all" ? undefined : v })

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

  // Split items by storage
  const allItems = useMemo(() => inventory?.items ?? [], [inventory])
  const bagItems = useMemo(
    () => allItems.filter((i) => i.storage !== "container"),
    [allItems]
  )
  const containerItems = useMemo(
    () => allItems.filter((i) => i.storage === "container"),
    [allItems]
  )

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
      if (item.item_type === "gem") return "Gem"
      if (item.item_type === "consumable") {
        return "Consumable"
      }
      const armorItem = armorIdMap.get(item.item_id)
      return armorItem?.armor_type ?? "Armor"
    },
    [bladeIdMap, armorIdMap, gripIdMap]
  )

  // Get blade-specific info (damage type, hands, grip name)
  const getBladeInfo = useCallback(
    (
      item: InventoryItem
    ): { damageType?: string; hands?: string; gripName?: string } => {
      if (item.item_type !== "blade") return {}
      const blade = bladeIdMap.get(item.item_id)
      if (!blade) return {}
      const grip = item.grip_id ? gripIdMap.get(item.grip_id) : null
      return {
        damageType: blade.damage_type,
        hands: blade.hands,
        gripName: grip ? fmt(grip.field_name) : undefined,
      }
    },
    [bladeIdMap, gripIdMap]
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

  // Categories from all items (bag + container), shared filter controls
  const itemCategories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of allItems) {
      const displayType = getItemDisplayType(item)
      const category = DISPLAY_TYPE_TO_CATEGORY[displayType] ?? displayType
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
    const order = [
      "Blade",
      "Grip",
      "Shield",
      "Helm",
      "Body",
      "Leg",
      "Arm",
      "Accessory",
      "Gem",
      "Consumable",
    ]
    return order
      .filter((c) => counts.has(c))
      .map((c) => ({ label: c, count: counts.get(c)! }))
  }, [allItems, getItemDisplayType])

  // Filter + sort applied to all items, then split by storage
  const filteredSorted = useMemo(() => {
    let list = allItems
    if (bagCategory !== "all") {
      list = list.filter((item) => {
        const displayType = getItemDisplayType(item)
        const category = DISPLAY_TYPE_TO_CATEGORY[displayType] ?? displayType
        return category === bagCategory
      })
    }
    if (bagSearch.trim()) {
      const q = bagSearch.trim().toLowerCase()
      list = list.filter((item) =>
        getItemDisplayName(item).toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (bagSort === "equipped") {
        const aEquipped = a.equip_slot ? 0 : 1
        const bEquipped = b.equip_slot ? 0 : 1
        if (aEquipped !== bEquipped) return aEquipped - bEquipped
        return b.id - a.id
      }
      if (bagSort === "name")
        return getItemDisplayName(a).localeCompare(getItemDisplayName(b))
      return b.id - a.id
    })
  }, [
    allItems,
    bagCategory,
    bagSearch,
    bagSort,
    getItemDisplayName,
    getItemDisplayType,
  ])

  const filteredBagItems = useMemo(
    () => filteredSorted.filter((i) => i.storage !== "container"),
    [filteredSorted]
  )
  const filteredContainerItems = useMemo(
    () => filteredSorted.filter((i) => i.storage === "container"),
    [filteredSorted]
  )

  // Per-section limit info when a category filter is active
  const sectionLimits = useMemo(() => {
    if (bagCategory === "all") return null
    const isArmorType = ARMOR_POOL_TYPES.has(bagCategory)
    const limitKey = isArmorType ? "Armor" : bagCategory
    const bagMax = BAG_LIMITS[limitKey]
    const containerMax = CONTAINER_LIMITS[limitKey]
    if (!bagMax && !containerMax) return null

    // Count all items in the pool (not just filtered — armor pool includes all sub-types)
    const poolFilter = isArmorType
      ? (item: InventoryItem) => {
          const dt = getItemDisplayType(item)
          const cat = DISPLAY_TYPE_TO_CATEGORY[dt] ?? dt
          return ARMOR_POOL_TYPES.has(cat)
        }
      : (item: InventoryItem) => {
          const dt = getItemDisplayType(item)
          const cat = DISPLAY_TYPE_TO_CATEGORY[dt] ?? dt
          return cat === bagCategory
        }

    const bagCount = bagItems.filter(poolFilter).length
    const containerCount = containerItems.filter(poolFilter).length
    const label = isArmorType ? "Armor" : bagCategory

    return {
      bag: bagMax ? `${label} ${bagCount}/${bagMax}` : null,
      container: containerMax
        ? `${label} ${containerCount}/${containerMax}`
        : null,
    }
  }, [bagCategory, bagItems, containerItems, getItemDisplayType])

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

  // ── Equip with swap logic ──────────────────────────────────────────

  const equipToSlot = useCallback(
    async (item: InventoryItem, targetSlot: EquipSlot) => {
      const updates: Promise<unknown>[] = []

      // Unequip current occupant of the target slot
      const currentOccupant = inventory?.items.find(
        (i) => i.equip_slot === targetSlot && i.id !== item.id
      )
      if (currentOccupant) {
        updates.push(
          inventoryApi.updateItem(inventoryId, currentOccupant.id, {
            equip_slot: null,
          })
        )
      }

      // 2H blade → also unequip shield
      if (targetSlot === "right_hand" && item.item_type === "blade") {
        const blade = bladeIdMap.get(item.item_id)
        if (blade?.hands === "2H") {
          const shield = inventory?.items.find(
            (i) => i.equip_slot === "left_hand"
          )
          if (shield) {
            updates.push(
              inventoryApi.updateItem(inventoryId, shield.id, {
                equip_slot: null,
              })
            )
          }
        }
      }

      // Equipping a shield → unequip 2H blade
      if (targetSlot === "left_hand") {
        const rhItem = inventory?.items.find(
          (i) => i.equip_slot === "right_hand"
        )
        if (rhItem && rhItem.item_type === "blade") {
          const blade = bladeIdMap.get(rhItem.item_id)
          if (blade?.hands === "2H") {
            updates.push(
              inventoryApi.updateItem(inventoryId, rhItem.id, {
                equip_slot: null,
              })
            )
          }
        }
      }

      // Wait for unequips to complete, then equip the new item
      await Promise.all(updates)
      await inventoryApi.updateItem(inventoryId, item.id, {
        equip_slot: targetSlot,
      })
      queryClient.invalidateQueries({ queryKey: ["inventory", inventoryId] })
      toast.success("Item equipped")
    },
    [inventory, inventoryId, bladeIdMap, queryClient]
  )

  // ── Drag and drop ───────────────────────────────────────────────────

  const [activeDragItem, setActiveDragItem] = useState<InventoryItem | null>(
    null
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const itemId = event.active.data.current?.itemId as number | undefined
      if (!itemId) return
      const item = allItems.find((i) => i.id === itemId)
      if (item) setActiveDragItem(item)
    },
    [allItems]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragItem(null)
      const { active, over } = event
      if (!over) return

      const itemId = active.data.current?.itemId as number | undefined
      const source = active.data.current?.source as
        | "bag"
        | "equip"
        | "container"
        | undefined
      if (!itemId || !source) return

      const item = allItems.find((i) => i.id === itemId)
      if (!item) return

      if (source === "bag" && over.id === "equipment-grid") {
        const targetSlot = getEquipSlotForItem(item)
        if (targetSlot) {
          equipToSlot(item, targetSlot)
        }
      } else if (source === "equip" && over.id === "bag-area") {
        updateItemMutation.mutate({ itemId: item.id, equip_slot: null })
      } else if (
        source === "bag" &&
        !item.equip_slot &&
        over.id === "container-area"
      ) {
        updateItemMutation.mutate({ itemId: item.id, storage: "container" })
      } else if (source === "container" && over.id === "bag-area") {
        updateItemMutation.mutate({ itemId: item.id, storage: "bag" })
      }
    },
    [allItems, equipToSlot, getEquipSlotForItem, updateItemMutation]
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
    <div className="mx-auto w-full max-w-[90rem] space-y-6">
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

      {/* Tabs */}
      <div className="border-border/50 flex gap-0 border-b">
        <Link
          to="/inventory/$inventoryId/equipment"
          params={{ inventoryId: String(inventoryId) }}
          className={cn(
            "relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "equipment"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className="size-4 shrink-0 bg-current"
            style={{
              mask: "url(/images/icons/Swords.svg) center / contain no-repeat",
              WebkitMask:
                "url(/images/icons/Swords.svg) center / contain no-repeat",
            }}
          />
          Equipment
          {activeTab === "equipment" && (
            <span className="bg-primary absolute bottom-0 left-0 h-0.5 w-full rounded-full" />
          )}
        </Link>
        <Link
          to="/inventory/$inventoryId/workbench"
          params={{ inventoryId: String(inventoryId) }}
          className={cn(
            "relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "workbench"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className="size-4 shrink-0 bg-current"
            style={{
              mask: "url(/images/icons/HammerPick.svg) center / contain no-repeat",
              WebkitMask:
                "url(/images/icons/HammerPick.svg) center / contain no-repeat",
            }}
          />
          Workbench
          {activeTab === "workbench" && (
            <span className="bg-primary absolute bottom-0 left-0 h-0.5 w-full rounded-full" />
          )}
        </Link>
        <Link
          to="/inventory/$inventoryId/loadout"
          params={{ inventoryId: String(inventoryId) }}
          className={cn(
            "relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "loadout"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className="size-4 shrink-0 bg-current"
            style={{
              mask: "url(/images/icons/Loadout.svg) center / contain no-repeat",
              WebkitMask:
                "url(/images/icons/Loadout.svg) center / contain no-repeat",
            }}
          />
          Loadout
          {activeTab === "loadout" && (
            <span className="bg-primary absolute bottom-0 left-0 h-0.5 w-full rounded-full" />
          )}
        </Link>
      </div>

      {/* Workbench Tab — kept mounted after first visit so search results,
          filter toggles, and expanded tree state survive tab switches. */}
      {mountedTabs.has("workbench") && (
        <div hidden={activeTab !== "workbench"}>
          <CraftingTab
            items={allItems}
            blades={blades}
            armor={armor}
            searchParams={search}
            updateSearch={updateSearch}
          />
        </div>
      )}

      {/* Loadout Tab — kept mounted after first visit so analyze results and
          inclusion toggles survive tab switches. */}
      {mountedTabs.has("loadout") && (
        <div hidden={activeTab !== "loadout"}>
          <LoadoutTab
            items={allItems}
            inventoryId={inventoryId}
            baseStats={
              inventory.base_str != null
                ? {
                    hp: inventory.base_hp ?? 0,
                    mp: inventory.base_mp ?? 0,
                    str: inventory.base_str,
                    int: inventory.base_int ?? 0,
                    agi: inventory.base_agi ?? 0,
                  }
                : undefined
            }
            searchParams={search}
            updateSearch={updateSearch}
          />
        </div>
      )}

      {/* Equipment Tab */}
      <div hidden={activeTab !== "equipment"}>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Shared filter controls for bag + container */}
          <div className="flex items-center gap-2">
            {itemCategories.length > 1 && (
              <Select value={bagCategory} onValueChange={setBagCategory}>
                <SelectTrigger className="h-9 w-auto min-w-[7rem] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({allItems.length})</SelectItem>
                  {itemCategories.map((c) => {
                    const limitKey = ARMOR_POOL_TYPES.has(c.label)
                      ? "Armor"
                      : c.label
                    const total =
                      (BAG_LIMITS[limitKey] ?? 0) +
                      (CONTAINER_LIMITS[limitKey] ?? 0)
                    return (
                      <SelectItem key={c.label} value={c.label}>
                        {c.label} ({c.count}
                        {total > 0 ? `/${total}` : ""})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={bagSearch}
                onChange={(e) => setBagSearch(e.target.value)}
                placeholder="Filter items..."
                className="pr-8 pl-9"
              />
              {bagSearch && (
                <button
                  type="button"
                  onClick={() => setBagSearch("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() =>
                setBagSort(
                  bagSort === "equipped"
                    ? "added"
                    : bagSort === "added"
                      ? "name"
                      : "equipped"
                )
              }
            >
              {bagSort === "name" ? (
                <ArrowDownAZ className="size-3.5" />
              ) : (
                <ArrowDownWideNarrow className="size-3.5" />
              )}
              {bagSort === "equipped"
                ? "Equipped"
                : bagSort === "added"
                  ? "Added"
                  : "Name"}
            </Button>
            <Button size="sm" onClick={() => setEditingBagItem(true)}>
              <Plus className="size-3.5" />
              Add Item
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
            {/* Left Column: Equipment + Stats */}
            <div className="space-y-6 pt-2">
              {/* Equipment Grid */}
              <div className="mx-auto max-w-sm lg:max-w-none">
                <h3 className="mb-3 text-base font-medium">
                  <Swords className="mr-1.5 inline size-4" />
                  Equipped
                </h3>
                <EquipmentGridDropZone
                  isOver={
                    activeDragItem !== null &&
                    activeDragItem.equip_slot === null &&
                    getEquipSlotForItem(activeDragItem) !== null
                  }
                >
                  <EquipmentGrid
                    getSlotItem={getSlotItem}
                    getItemDisplayName={getItemDisplayName}
                    getItemDisplayType={getItemDisplayType}
                    getBladeInfo={getBladeInfo}
                    onSlotClick={setEditingSlot}
                    onUnequip={(slotItem) =>
                      updateItemMutation.mutate({
                        itemId: slotItem.id,
                        equip_slot: null,
                      })
                    }
                    equippedBladeIs2H={equippedBladeIs2H}
                  />
                </EquipmentGridDropZone>
              </div>

              {/* Combined Stats */}
              {combinedStats &&
                inventory.items.some((i) => i.equip_slot != null) && (
                  <CombinedStatsCard
                    stats={combinedStats}
                    baseStats={
                      inventory.base_str != null
                        ? {
                            hp: inventory.base_hp ?? 0,
                            mp: inventory.base_mp ?? 0,
                            str: inventory.base_str,
                            int: inventory.base_int ?? 0,
                            agi: inventory.base_agi ?? 0,
                          }
                        : undefined
                    }
                  />
                )}
            </div>

            {/* Middle Column: Item Bag */}
            <BagDropZone
              isOver={
                activeDragItem !== null &&
                (activeDragItem.equip_slot !== null ||
                  activeDragItem.storage === "container")
              }
            >
              <div className="space-y-3">
                <h3 className="text-base font-medium">
                  <Package className="mr-1.5 inline size-4" />
                  Item Bag ({filteredBagItems.length})
                  {sectionLimits?.bag && (
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      {sectionLimits.bag}
                    </span>
                  )}
                </h3>
                {bagItems.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No items in the bag
                  </p>
                ) : filteredBagItems.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No items match
                    {bagCategory !== "all" && ` "${bagCategory}"`}
                    {bagSearch && ` "${bagSearch}"`}
                  </p>
                ) : (
                  <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                    {filteredBagItems.map((item) => {
                      const targetSlot = !item.equip_slot
                        ? getEquipSlotForItem(item)
                        : null
                      return (
                        <DraggableBagItemRow
                          key={item.id}
                          item={item}
                          name={getItemDisplayName(item)}
                          type={getItemDisplayType(item)}
                          {...getBladeInfo(item)}
                          isDraggable
                          isDragging={activeDragItem?.id === item.id}
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
                              ? () => equipToSlot(item, targetSlot)
                              : undefined
                          }
                          onMoveToContainer={
                            !item.equip_slot
                              ? () =>
                                  updateItemMutation.mutate({
                                    itemId: item.id,
                                    storage: "container",
                                  })
                              : undefined
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </BagDropZone>

            {/* Right Column: Container */}
            <ContainerDropZone
              isOver={
                activeDragItem !== null &&
                activeDragItem.storage !== "container" &&
                !activeDragItem.equip_slot
              }
            >
              <div className="space-y-3">
                <h3 className="text-base font-medium">
                  <Package className="mr-1.5 inline size-4" />
                  Container ({filteredContainerItems.length})
                  {sectionLimits?.container && (
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      {sectionLimits.container}
                    </span>
                  )}
                </h3>
                {containerItems.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    Drop items here to store them
                  </p>
                ) : filteredContainerItems.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    No items match filter
                  </p>
                ) : (
                  <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                    {filteredContainerItems.map((item) => (
                      <DraggableBagItemRow
                        key={item.id}
                        item={item}
                        name={getItemDisplayName(item)}
                        type={getItemDisplayType(item)}
                        {...getBladeInfo(item)}
                        isDraggable
                        isDragging={activeDragItem?.id === item.id}
                        onDelete={() => deleteItemMutation.mutate(item.id)}
                        onMoveToBag={() =>
                          updateItemMutation.mutate({
                            itemId: item.id,
                            storage: "bag",
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </ContainerDropZone>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeDragItem && (
              <div className="bg-card border-primary/50 rounded-lg border px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <ItemIcon
                    type={getItemDisplayType(activeDragItem)}
                    size="sm"
                  />
                  <span className="text-sm font-medium">
                    {getItemDisplayName(activeDragItem)}
                  </span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

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
            isPending={
              addItemMutation.isPending || updateItemMutation.isPending
            }
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
    </div>
  )
}

// ── Drop zones ──────────────────────────────────────────────────────

function EquipmentGridDropZone({
  isOver,
  children,
}: {
  isOver: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: "equipment-grid",
  })
  const highlight = isOver && isDropOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-transparent p-2 transition-colors",
        highlight && "border-primary/50 bg-primary/5"
      )}
    >
      {children}
    </div>
  )
}

function BagDropZone({
  isOver,
  children,
}: {
  isOver: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver: isDropOver } = useDroppable({ id: "bag-area" })
  const highlight = isOver && isDropOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-transparent p-2 transition-colors",
        highlight && "border-primary/50 bg-primary/5"
      )}
    >
      {children}
    </div>
  )
}

function ContainerDropZone({
  isOver,
  children,
}: {
  isOver: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: "container-area",
  })
  const highlight = isOver && isDropOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-transparent p-2 transition-colors",
        highlight && "border-primary/50 bg-primary/5"
      )}
    >
      {children}
    </div>
  )
}

// ── Equipment Grid ──────────────────────────────────────────────────

function EquipmentGrid({
  getSlotItem,
  getItemDisplayName,
  getItemDisplayType,
  getBladeInfo,
  onSlotClick,
  onUnequip,
  equippedBladeIs2H,
}: {
  getSlotItem: (slot: EquipSlot) => InventoryItem | undefined
  getItemDisplayName: (item: InventoryItem) => string
  getItemDisplayType: (item: InventoryItem) => string
  getBladeInfo: (item: InventoryItem) => {
    damageType?: string
    hands?: string
    gripName?: string
  }
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
          ".        head      accessory"
          "rhand    body      lhand"
          "arms     legs      ."
        `,
      }}
    >
      {EQUIP_SLOTS.map((slot) => {
        const item = getSlotItem(slot.key)
        const disabled = slot.key === "left_hand" && equippedBladeIs2H
        const bladeInfo = item ? getBladeInfo(item) : {}
        return (
          <div key={slot.key} style={{ gridArea: slot.gridArea }}>
            {item ? (
              <DraggableEquipSlotCard
                item={item}
                displayName={getItemDisplayName(item)}
                displayType={getItemDisplayType(item)}
                damageType={bladeInfo.damageType}
                hands={bladeInfo.hands}
                gripName={bladeInfo.gripName}
                onClick={() => !disabled && onSlotClick(slot)}
                onClear={() => onUnequip(item)}
                disabled={disabled}
              />
            ) : (
              <EquipSlotCard
                slot={slot}
                onClick={() => !disabled && onSlotClick(slot)}
                disabled={disabled}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DraggableEquipSlotCard({
  item,
  displayName,
  displayType,
  damageType,
  hands,
  gripName,
  onClick,
  onClear,
  disabled,
}: {
  item: InventoryItem
  displayName: string
  displayType: string
  damageType?: string
  hands?: string
  gripName?: string
  onClick: () => void
  onClear: () => void
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `equip-${item.id}`,
    data: { itemId: item.id, source: "equip" },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        "border-border hover:border-foreground/30 group bg-card/50 relative flex h-full w-full flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
        isDragging && "opacity-40"
      )}
      {...listeners}
      {...attributes}
    >
      <ItemIcon type={displayType} size="sm" />
      <span className="max-w-full truncate text-sm leading-tight font-medium">
        {displayName}
      </span>
      {item.material && <MaterialBadge mat={item.material} />}
      {(damageType || hands) && (
        <div className="flex items-center gap-1 text-[10px]">
          {damageType && <DamageTypeBadge type={damageType} />}
          {hands && <span className="text-muted-foreground">{hands}</span>}
        </div>
      )}
      {gripName && (
        <span className="text-muted-foreground text-[10px]">
          Grip: {gripName}
        </span>
      )}
      {onClear && !disabled && (
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

function EquipSlotCard({
  slot,
  onClick,
  disabled,
}: {
  slot: SlotConfig
  onClick: () => void
  disabled?: boolean
}) {
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

// ── Bag Item Row ────────────────────────────────────────────────────

function DraggableBagItemRow({
  item,
  name,
  type,
  damageType,
  hands,
  gripName,
  isDraggable,
  isDragging,
  onDelete,
  onUnequip,
  onEquip,
  onMoveToContainer,
  onMoveToBag,
}: {
  item: InventoryItem
  name: string
  type: string
  damageType?: string
  hands?: string
  gripName?: string
  isDraggable: boolean
  isDragging: boolean
  onDelete: () => void
  onUnequip?: () => void
  onEquip?: () => void
  onMoveToContainer?: () => void
  onMoveToBag?: () => void
}) {
  const source = item.equip_slot
    ? "equip"
    : item.storage === "container"
      ? "container"
      : "bag"
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `bag-${item.id}`,
    data: { itemId: item.id, source },
    disabled: !isDraggable,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-border/50 flex items-center gap-3 rounded-lg border px-3 py-2",
        isDraggable && "cursor-grab",
        isDragging && "opacity-40"
      )}
      {...listeners}
      {...attributes}
    >
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
        <div className="flex items-center gap-1.5">
          {item.material && <MaterialBadge mat={item.material} />}
          {damageType && <DamageTypeBadge type={damageType} />}
          {hands && (
            <span className="text-muted-foreground text-[10px]">{hands}</span>
          )}
          {gripName && (
            <span className="text-muted-foreground text-[10px]">
              Grip: {gripName}
            </span>
          )}
        </div>
      </div>
      {(item.quantity > 1 || item.item_type === "consumable") && (
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
      {onMoveToContainer && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground shrink-0"
          title="Move to container"
          onClick={onMoveToContainer}
        >
          <ArrowRightFromLine className="size-3.5" />
        </Button>
      )}
      {onMoveToBag && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground shrink-0"
          title="Move to bag"
          onClick={onMoveToBag}
        >
          <ArrowLeftFromLine className="size-3.5" />
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
  baseStats,
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
  baseStats?: { hp: number; mp: number; str: number; int: number; agi: number }
}) {
  return (
    <Card className="mx-auto max-w-sm lg:max-w-none">
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-center text-xs font-semibold tracking-wider uppercase">
          Combined Stats
        </p>

        {/* Base + equipment core stats */}
        {baseStats ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap justify-center gap-1.5">
              <StatBox
                label="STR"
                value={baseStats.str + stats.str}
                diff={stats.str}
              />
              <StatBox
                label="INT"
                value={baseStats.int + stats.int}
                diff={stats.int}
              />
              <StatBox
                label="AGI"
                value={baseStats.agi + stats.agi}
                diff={stats.agi}
              />
              {stats.hasBlade && (
                <>
                  <StatBox label="RNG" value={stats.range} />
                  <StatBox label="RSK" value={stats.risk} />
                </>
              )}
            </div>
            <p className="text-muted-foreground/60 text-center text-[9px]">
              Base + equipment modifier
            </p>
          </div>
        ) : (
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
        )}

        {/* Damage type stats */}
        {stats.hasBlade && (
          <div className="flex flex-wrap justify-center gap-1.5">
            <StatBox label="Blt" value={stats.blunt} />
            <StatBox label="Edg" value={stats.edged} />
            <StatBox label="Prc" value={stats.piercing} />
          </div>
        )}

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

  const [targetStorage, setTargetStorage] = useState<"bag" | "container">("bag")
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
      storage: slot ? "bag" : targetStorage,
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
                : targetStorage === "container"
                  ? "Add to Container"
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
          {/* Storage toggle (only for bag/container add, not equip slots) */}
          {!slot && (
            <div className="flex gap-2">
              <Button
                variant={targetStorage === "bag" ? "default" : "outline"}
                size="sm"
                onClick={() => setTargetStorage("bag")}
              >
                <Package className="mr-1.5 size-3.5" />
                Bag
              </Button>
              <Button
                variant={targetStorage === "container" ? "default" : "outline"}
                size="sm"
                onClick={() => setTargetStorage("container")}
              >
                <Package className="mr-1.5 size-3.5" />
                Container
              </Button>
            </div>
          )}

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
