/**
 * Maps parsed save slot data to GameSaveImportItem[] for the server-side import endpoint.
 *
 * The save parser returns ITEMNAME.BIN indices (absolute game-internal IDs).
 * This module converts them to field_name strings using the static ITEMNAME_MAP
 * game constant. The API endpoint resolves field_names to database records
 * server-side — no database IDs or game data API calls are needed here.
 */

import type { EquipSlot } from "@/lib/inventory-api"
import { ITEMNAME_MAP } from "@/lib/itemname-map"
import type {
  ParsedArmor,
  ParsedBlade,
  ParsedGem,
  ParsedGrip,
  ParsedInventory,
  ParsedMisc,
  ParsedSaveSlot,
  ParsedShield,
  ParsedWeapon,
} from "@/lib/save-parser"

// ── Material mapping (must match save-parser.ts MATERIALS array) ─────

const MATERIAL_BY_ID: Record<number, string> = {
  1: "Wood",
  2: "Leather",
  3: "Bronze",
  4: "Iron",
  5: "Hagane",
  6: "Silver",
  7: "Damascus",
}

// ── Types ────────────────────────────────────────────────────────────

export interface GameSaveImportItem {
  item_type: string
  field_name: string
  material?: string | null
  grip_field_name?: string | null
  gem_field_names?: string[]
  equip_slot?: EquipSlot | null
  storage?: "bag" | "container"
  quantity?: number
  dp_current?: number
  dp_max?: number
  pp_current?: number
  pp_max?: number
}

export interface GameSaveMapperResult {
  items: GameSaveImportItem[]
  warnings: string[]
}

// ── Mapper ───────────────────────────────────────────────────────────

/**
 * Map a parsed save slot to GameSaveImportItem[] identified by field_name.
 *
 * No game data API calls or database IDs are needed — only the static
 * ITEMNAME_MAP game constant is used for resolution.
 */
export function mapSaveSlotToGameSaveImportItems(
  slot: ParsedSaveSlot
): GameSaveMapperResult {
  const usedEquipSlots = new Set<EquipSlot>()
  const warnings: string[] = []
  const items: GameSaveImportItem[] = []

  function resolveFieldName(itemnameIndex: number): string | undefined {
    return ITEMNAME_MAP.get(itemnameIndex)?.fieldName
  }

  function resolveGemFieldName(
    gemRef: number,
    inv: ParsedInventory
  ): string | null {
    if (gemRef === 0) return null
    const parsedGem = inv.gems.find((g) => g.index === gemRef)
    if (!parsedGem) return null
    return resolveFieldName(parsedGem.id) ?? null
  }

  function mapInventory(inv: ParsedInventory, storage: "bag" | "container") {
    for (const weapon of inv.weapons) {
      mapWeapon(weapon, inv, storage)
    }
    for (const shield of inv.shields) {
      mapShield(shield, storage)
    }
    for (const blade of inv.blades) {
      if (blade.weaponRef !== 0) continue
      mapLooseBlade(blade, storage)
    }
    for (const grip of inv.grips) {
      if (grip.weaponRef !== 0) continue
      mapLooseGrip(grip, storage)
    }
    for (const armor of inv.armor) {
      mapArmor(armor, storage)
    }
    for (const gem of inv.gems) {
      if (gem.setItemRef !== 0) continue
      mapGem(gem, storage)
    }
    for (const misc of inv.misc) {
      mapMisc(misc, storage)
    }
  }

  function mapWeapon(
    weapon: ParsedWeapon,
    inv: ParsedInventory,
    storage: "bag" | "container"
  ) {
    const parsedBlade = inv.blades.find((b) => b.index === weapon.bladeRef)
    if (!parsedBlade) {
      warnings.push(
        `Weapon "${weapon.name}": blade ref ${weapon.bladeRef} not found in parsed data`
      )
      return
    }

    const bladeFieldName = resolveFieldName(parsedBlade.id)
    if (!bladeFieldName) {
      warnings.push(
        `Weapon "${weapon.name}": blade ITEMNAME ${parsedBlade.id} unmapped`
      )
      return
    }

    // Resolve grip field_name
    let gripFieldName: string | null = null
    const parsedGrip = inv.grips.find((g) => g.index === weapon.gripRef)
    if (parsedGrip) {
      gripFieldName = resolveFieldName(parsedGrip.id) ?? null
      if (!gripFieldName) {
        warnings.push(
          `Weapon "${weapon.name}": grip ITEMNAME ${parsedGrip.id} unmapped`
        )
      }
    }

    // Resolve gem field_names
    const gemFieldNames: string[] = []
    for (const gemRef of weapon.gemRefs) {
      const fn = resolveGemFieldName(gemRef, inv)
      if (fn) gemFieldNames.push(fn)
    }

    let equipSlot: EquipSlot | null = null
    if (
      storage === "bag" &&
      weapon.isEquipped &&
      !usedEquipSlots.has("right_hand")
    ) {
      equipSlot = "right_hand"
      usedEquipSlots.add("right_hand")
    }

    items.push({
      item_type: "blade",
      field_name: bladeFieldName,
      material: MATERIAL_BY_ID[parsedBlade.materialId] ?? null,
      grip_field_name: gripFieldName,
      gem_field_names: gemFieldNames.length > 0 ? gemFieldNames : undefined,
      equip_slot: equipSlot,
      storage,
      dp_current: parsedBlade.currentDp,
      dp_max: parsedBlade.maxDp,
      pp_current: parsedBlade.currentPp,
      pp_max: parsedBlade.maxPp,
    })
  }

  function mapShield(shield: ParsedShield, storage: "bag" | "container") {
    const fieldName = resolveFieldName(shield.id)
    if (!fieldName) {
      warnings.push(`Shield ITEMNAME ${shield.id} unmapped`)
      return
    }

    const inv = storage === "bag" ? slot.inventory : slot.container
    const gemFieldNames: string[] = []
    for (const gemRef of shield.gemRefs) {
      const fn = resolveGemFieldName(gemRef, inv)
      if (fn) gemFieldNames.push(fn)
    }

    let equipSlot: EquipSlot | null = null
    if (
      storage === "bag" &&
      shield.isEquipped &&
      !usedEquipSlots.has("left_hand")
    ) {
      equipSlot = "left_hand"
      usedEquipSlots.add("left_hand")
    }

    items.push({
      item_type: "armor",
      field_name: fieldName,
      material: MATERIAL_BY_ID[shield.materialId] ?? null,
      gem_field_names: gemFieldNames.length > 0 ? gemFieldNames : undefined,
      equip_slot: equipSlot,
      storage,
      dp_current: shield.currentDp,
      dp_max: shield.maxDp,
      pp_current: shield.currentPp,
      pp_max: shield.maxPp,
    })
  }

  function mapLooseBlade(blade: ParsedBlade, storage: "bag" | "container") {
    const fieldName = resolveFieldName(blade.id)
    if (!fieldName) {
      warnings.push(`Blade ITEMNAME ${blade.id} unmapped`)
      return
    }

    items.push({
      item_type: "blade",
      field_name: fieldName,
      material: MATERIAL_BY_ID[blade.materialId] ?? null,
      storage,
      dp_current: blade.currentDp,
      dp_max: blade.maxDp,
      pp_current: blade.currentPp,
      pp_max: blade.maxPp,
    })
  }

  function mapLooseGrip(grip: ParsedGrip, storage: "bag" | "container") {
    const fieldName = resolveFieldName(grip.id)
    if (!fieldName) {
      warnings.push(`Grip ITEMNAME ${grip.id} unmapped`)
      return
    }

    items.push({
      item_type: "grip",
      field_name: fieldName,
      storage,
    })
  }

  function mapArmor(armor: ParsedArmor, storage: "bag" | "container") {
    const fieldName = resolveFieldName(armor.id)
    if (!fieldName) {
      warnings.push(`Armor ITEMNAME ${armor.id} unmapped`)
      return
    }

    // Equip slot from body part
    let equipSlot: EquipSlot | null = null
    if (storage === "bag" && armor.bodyPart !== 0) {
      const slotMap: Record<number, EquipSlot> = {
        1: "arms",
        2: "arms",
        3: "head",
        4: "body",
        5: "legs",
        6: "accessory",
        7: "accessory",
      }
      const candidate = slotMap[armor.bodyPart] ?? null
      if (candidate && !usedEquipSlots.has(candidate)) {
        equipSlot = candidate
        usedEquipSlots.add(candidate)
      }
    }

    // Material — accessories have materialId but it's meaningless.
    // The server handles nullifying material for accessories after resolving the armor_type.
    items.push({
      item_type: "armor",
      field_name: fieldName,
      material: MATERIAL_BY_ID[armor.materialId] ?? null,
      equip_slot: equipSlot,
      storage,
      dp_current: armor.currentDp,
      dp_max: armor.maxDp,
      pp_current: armor.currentPp,
      pp_max: armor.maxPp,
    })
  }

  function mapGem(gem: ParsedGem, storage: "bag" | "container") {
    const fieldName = resolveFieldName(gem.id)
    if (!fieldName) {
      warnings.push(`Gem ITEMNAME ${gem.id} unmapped`)
      return
    }

    items.push({
      item_type: "gem",
      field_name: fieldName,
      storage,
    })
  }

  function mapMisc(misc: ParsedMisc, storage: "bag" | "container") {
    const entry = ITEMNAME_MAP.get(misc.id)
    if (!entry) {
      // Materials (254-260), grimoires (386+), and other special items
      warnings.push(
        `Misc ITEMNAME ${misc.id}: unmapped (quantity: ${misc.quantity})`
      )
      return
    }

    items.push({
      item_type: entry.type,
      field_name: entry.fieldName,
      quantity: misc.quantity || 1,
      storage,
    })
  }

  mapInventory(slot.inventory, "bag")
  mapInventory(slot.container, "container")

  return { items, warnings }
}
