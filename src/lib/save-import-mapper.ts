/**
 * Maps parsed save slot data to CreateInventoryItem[] ready for the batch import API.
 *
 * The save parser returns game_item_ids (ITEMNAME.BIN indices). This module resolves
 * those to API database IDs via the `game_id` field on each game data table.
 */

import type { Armor, Blade, Consumable, Gem, Grip } from "@/lib/game-api"
import type { CreateInventoryItem, EquipSlot } from "@/lib/inventory-api"
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

// ── Material mapping ─────────────────────────────────────────────────

const MATERIAL_BY_ID: Record<number, string> = {
  0: "Wood",
  1: "Leather",
  2: "Bronze",
  3: "Iron",
  4: "Hagane",
  5: "Silver",
  6: "Damascus",
}

// ── Body part → equip slot ───────────────────────────────────────────

const BODY_PART_TO_EQUIP_SLOT: Record<number, EquipSlot> = {
  0: "left_hand", // Shield
  1: "head", // Helm
  2: "body", // Body
  3: "arms", // Arms
  4: "legs", // Legs
  5: "accessory", // Accessory
}

// ── Game data lookup maps ────────────────────────────────────────────

interface GameData {
  blades: Blade[]
  armor: Armor[]
  grips: Grip[]
  gems: Gem[]
  consumables: Consumable[]
}

function buildGameIdMap<T extends { game_id: number }>(
  items: T[]
): Map<number, T> {
  const map = new Map<number, T>()
  for (const item of items) map.set(item.game_id, item)
  return map
}

// ── Determine item_type from ITEMNAME.BIN game_id range ──────────────

function resolveItemType(
  gameId: number
): "blade" | "grip" | "armor" | "gem" | "consumable" | null {
  if (gameId >= 1 && gameId <= 90) return "blade"
  if (gameId >= 96 && gameId <= 126) return "grip"
  if (gameId >= 128 && gameId <= 206) return "armor"
  if (gameId >= 261 && gameId <= 310) return "gem"
  // Consumables, grimoires, keys, sigils etc. use various ranges
  // The consumable table in the API covers game_ids for misc items
  return "consumable"
}

// ── Main mapper ──────────────────────────────────────────────────────

export interface MapperResult {
  items: CreateInventoryItem[]
  warnings: string[]
}

/**
 * Map a parsed save slot's inventory to CreateInventoryItem[] for the batch API.
 */
export function mapSaveSlotToItems(
  slot: ParsedSaveSlot,
  gameData: GameData
): MapperResult {
  const bladeByGameId = buildGameIdMap(gameData.blades)
  const armorByGameId = buildGameIdMap(gameData.armor)
  const gripByGameId = buildGameIdMap(gameData.grips)
  const gemByGameId = buildGameIdMap(gameData.gems)
  const consumableByGameId = buildGameIdMap(gameData.consumables)
  const warnings: string[] = []
  const items: CreateInventoryItem[] = []

  function mapInventory(inv: ParsedInventory, storage: "bag" | "container") {
    // Map assembled weapons (blade + grip + gems + equip state)
    for (const weapon of inv.weapons) {
      mapWeapon(weapon, inv, storage)
    }

    // Map shields
    for (const shield of inv.shields) {
      mapShield(shield, storage)
    }

    // Map loose blades (not attached to a weapon)
    for (const blade of inv.blades) {
      if (blade.weaponRef !== 0) continue // attached to a weapon
      mapBlade(blade, storage)
    }

    // Map loose grips (not attached to a weapon)
    for (const grip of inv.grips) {
      if (grip.weaponRef !== 0) continue // attached to a weapon
      mapGrip(grip, storage)
    }

    // Map armor (helms, body, legs, arms, accessories)
    for (const armor of inv.armor) {
      mapArmor(armor, storage)
    }

    // Map loose gems (not socketed into anything)
    for (const gem of inv.gems) {
      if (gem.setItemRef !== 0) continue // socketed
      mapGem(gem, storage)
    }

    // Map misc items (consumables, grimoires, keys, etc.)
    for (const misc of inv.misc) {
      mapMisc(misc, storage)
    }
  }

  function mapWeapon(
    weapon: ParsedWeapon,
    inv: ParsedInventory,
    storage: "bag" | "container"
  ) {
    // Resolve blade by 1-based ref into the blade array
    const parsedBlade = inv.blades.find((b) => b.index === weapon.bladeRef)
    if (!parsedBlade) {
      warnings.push(
        `Weapon "${weapon.name}": blade ref ${weapon.bladeRef} not found`
      )
      return
    }

    const apiBlade = bladeByGameId.get(parsedBlade.id)
    if (!apiBlade) {
      warnings.push(
        `Weapon "${weapon.name}": blade game_id ${parsedBlade.id} not in API`
      )
      return
    }

    // Resolve grip
    const parsedGrip = inv.grips.find((g) => g.index === weapon.gripRef)
    let apiGripId: number | null = null
    if (parsedGrip) {
      const apiGrip = gripByGameId.get(parsedGrip.id)
      if (apiGrip) {
        apiGripId = apiGrip.id
      } else {
        warnings.push(
          `Weapon "${weapon.name}": grip game_id ${parsedGrip.id} not in API`
        )
      }
    }

    // Resolve gems (from weapon's gemRefs, which are 1-based indices into gem array)
    const gemIds: (number | null)[] = [null, null, null]
    for (let i = 0; i < weapon.gemRefs.length && i < 3; i++) {
      const gemRef = weapon.gemRefs[i]
      if (gemRef === 0) continue
      const parsedGem = inv.gems.find((g) => g.index === gemRef)
      if (!parsedGem) continue
      const apiGem = gemByGameId.get(parsedGem.id)
      if (apiGem) {
        gemIds[i] = apiGem.id
      }
    }

    // Determine equip slot (only in bag)
    let equipSlot: EquipSlot | null = null
    if (storage === "bag" && weapon.isEquipped) {
      equipSlot = "right_hand"
    }

    items.push({
      item_type: "blade",
      item_id: apiBlade.id,
      material: MATERIAL_BY_ID[parsedBlade.materialId] ?? null,
      grip_id: apiGripId,
      gem_1_id: gemIds[0],
      gem_2_id: gemIds[1],
      gem_3_id: gemIds[2],
      equip_slot: equipSlot,
      storage,
    })
  }

  function mapShield(shield: ParsedShield, storage: "bag" | "container") {
    const apiArmor = armorByGameId.get(shield.id)
    if (!apiArmor) {
      warnings.push(`Shield game_id ${shield.id} not in API`)
      return
    }

    // Resolve gems
    const gemIds: (number | null)[] = [null, null, null]
    for (let i = 0; i < shield.gemRefs.length && i < 3; i++) {
      const gemRef = shield.gemRefs[i]
      if (gemRef === 0) continue
      // Shield gemRefs are 1-based indices into the parent inventory's gem array
      // We need to find the gem in the slot's parent inventory
      const parsedGem =
        storage === "bag"
          ? slot.inventory.gems.find((g) => g.index === gemRef)
          : slot.container.gems.find((g) => g.index === gemRef)
      if (!parsedGem) continue
      const apiGem = gemByGameId.get(parsedGem.id)
      if (apiGem) {
        gemIds[i] = apiGem.id
      }
    }

    let equipSlot: EquipSlot | null = null
    if (storage === "bag" && shield.isEquipped) {
      equipSlot = "left_hand"
    }

    items.push({
      item_type: "armor",
      item_id: apiArmor.id,
      material: MATERIAL_BY_ID[shield.materialId] ?? null,
      grip_id: null,
      gem_1_id: gemIds[0],
      gem_2_id: gemIds[1],
      gem_3_id: gemIds[2],
      equip_slot: equipSlot,
      storage,
    })
  }

  function mapBlade(blade: ParsedBlade, storage: "bag" | "container") {
    const apiBlade = bladeByGameId.get(blade.id)
    if (!apiBlade) {
      warnings.push(`Blade game_id ${blade.id} not in API`)
      return
    }

    items.push({
      item_type: "blade",
      item_id: apiBlade.id,
      material: MATERIAL_BY_ID[blade.materialId] ?? null,
      storage,
    })
  }

  function mapGrip(grip: ParsedGrip, storage: "bag" | "container") {
    const apiGrip = gripByGameId.get(grip.id)
    if (!apiGrip) {
      warnings.push(`Grip game_id ${grip.id} not in API`)
      return
    }

    items.push({
      item_type: "grip",
      item_id: apiGrip.id,
      storage,
    })
  }

  function mapArmor(armor: ParsedArmor, storage: "bag" | "container") {
    const apiArmor = armorByGameId.get(armor.id)
    if (!apiArmor) {
      warnings.push(`Armor game_id ${armor.id} not in API`)
      return
    }

    // Determine equip slot from bodyPart
    let equipSlot: EquipSlot | null = null
    if (storage === "bag") {
      // Check if this armor piece has a valid body part for equipping
      const possibleSlot = BODY_PART_TO_EQUIP_SLOT[armor.bodyPart]
      if (possibleSlot) {
        // The armor table doesn't have an isEquipped flag directly —
        // bodyPart is always set (it defines the armor type, not equip state).
        // We skip auto-equipping armor from imports; the user can equip manually.
        equipSlot = null
      }
    }

    items.push({
      item_type: "armor",
      item_id: apiArmor.id,
      material: MATERIAL_BY_ID[armor.materialId] ?? null,
      equip_slot: equipSlot,
      storage,
    })
  }

  function mapGem(gem: ParsedGem, storage: "bag" | "container") {
    const apiGem = gemByGameId.get(gem.id)
    if (!apiGem) {
      warnings.push(`Gem game_id ${gem.id} not in API`)
      return
    }

    items.push({
      item_type: "gem",
      item_id: apiGem.id,
      storage,
    })
  }

  function mapMisc(misc: ParsedMisc, storage: "bag" | "container") {
    const itemType = resolveItemType(misc.id)
    if (!itemType) {
      warnings.push(`Misc item game_id ${misc.id}: unknown type`)
      return
    }

    // Try to find it in consumables first (most common misc type)
    const apiConsumable = consumableByGameId.get(misc.id)
    if (apiConsumable) {
      items.push({
        item_type: "consumable",
        item_id: apiConsumable.id,
        quantity: misc.quantity || 1,
        storage,
      })
      return
    }

    // Could also be a gem (some gems appear in misc slots)
    const apiGem = gemByGameId.get(misc.id)
    if (apiGem) {
      items.push({
        item_type: "gem",
        item_id: apiGem.id,
        quantity: misc.quantity || 1,
        storage,
      })
      return
    }

    // Fallback: skip unknown items with a warning
    warnings.push(`Misc item game_id ${misc.id}: not found in API`)
  }

  // Map active (bag) inventory
  mapInventory(slot.inventory, "bag")

  // Map container inventory
  mapInventory(slot.container, "container")

  return { items, warnings }
}
