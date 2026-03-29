/**
 * Maps parsed save slot data to CreateInventoryItem[] ready for the batch import API.
 *
 * The save parser returns ITEMNAME.BIN indices (absolute game IDs). This module
 * maps them to API items using stable identifiers (game_id for blades/gems/consumables,
 * positional index for grips, game_id for armor).
 *
 * ITEMNAME.BIN ranges:
 *   Blades:      1-90    (game_id matches directly)
 *   Grips:       96-126  (position-based: sorted by id, index 0 = ITEMNAME 96)
 *   Shields:     128-143 (game_id = ITEMNAME - 127)
 *   Helms:       144-159 (game_id = ITEMNAME - 127)
 *   Body:        160-175 (game_id = ITEMNAME - 127)
 *   Legs:        176-191 (game_id = ITEMNAME - 127)
 *   Arms:        192-207 (game_id = ITEMNAME - 127)
 *   Accessories: 223-253 (game_id = ITEMNAME - 142)
 *   Gems:        261-310 (game_id matches directly after offset)
 *   Consumables: 323-356 (game_id matches directly after offset)
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

// ── Material mapping (must match save-parser.ts MATERIALS array) ─────

// Material IDs in the save file are 1-based (0 = no material)
const MATERIAL_BY_ID: Record<number, string> = {
  1: "Wood",
  2: "Leather",
  3: "Bronze",
  4: "Iron",
  5: "Hagane",
  6: "Silver",
  7: "Damascus",
}

// ── ITEMNAME.BIN → game_id conversion ────────────────────────────────
// These convert ITEMNAME.BIN absolute indices to the game_id values
// stored in the API database. Grips use a separate positional lookup.

function bladeGameId(saveId: number): number {
  return saveId // 1-90 direct
}

function armorGameId(saveId: number): number {
  // Shields/Helms/Body/Legs/Arms: 128-207
  if (saveId <= 207) return saveId - 127
  // Accessories: 223-253 (gap at 208-222)
  return saveId - 142
}

function gemGameId(saveId: number): number {
  return saveId - 260 // 261→1, 310→50
}

function consumableGameId(saveId: number): number {
  return saveId - 322 // 323→1, 356→34
}

// ── Game data lookup maps ────────────────────────────────────────────

interface GameData {
  blades: Blade[]
  armor: Armor[]
  grips: Grip[]
  gems: Gem[]
  consumables: Consumable[]
}

/** Build a map keyed by game_id (falls back to id if game_id is 0/missing). */
function buildGameIdMap<T extends { id: number; game_id?: number }>(
  items: T[]
): Map<number, T> {
  const map = new Map<number, T>()
  for (const item of items) {
    const key = item.game_id && item.game_id > 0 ? item.game_id : item.id
    map.set(key, item)
  }
  return map
}

/**
 * Build a map from ITEMNAME.BIN index → Grip.
 * Grips don't have unique game_ids, so we use positional mapping:
 * grips sorted by id correspond to ITEMNAME indices 96, 97, 98, ...
 */
function buildGripItemnameMap(grips: Grip[]): Map<number, Grip> {
  const sorted = [...grips].sort((a, b) => a.id - b.id)
  const map = new Map<number, Grip>()
  sorted.forEach((grip, i) => map.set(96 + i, grip))
  return map
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
  const gripByItemname = buildGripItemnameMap(gameData.grips)
  const gemByGameId = buildGameIdMap(gameData.gems)
  // Track assigned equip slots to avoid duplicates (e.g. R.Arm + L.Arm → one "arms" slot)
  const usedEquipSlots = new Set<EquipSlot>()
  const consumableByGameId = buildGameIdMap(gameData.consumables)
  const warnings: string[] = []
  const items: CreateInventoryItem[] = []

  function mapInventory(inv: ParsedInventory, storage: "bag" | "container") {
    for (const weapon of inv.weapons) {
      mapWeapon(weapon, inv, storage)
    }
    for (const shield of inv.shields) {
      mapShield(shield, storage)
    }
    for (const blade of inv.blades) {
      if (blade.weaponRef !== 0) continue
      mapBlade(blade, storage)
    }
    for (const grip of inv.grips) {
      if (grip.weaponRef !== 0) continue
      mapGrip(grip, storage)
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

  function resolveGemId(gemRef: number, inv: ParsedInventory): number | null {
    if (gemRef === 0) return null
    const parsedGem = inv.gems.find((g) => g.index === gemRef)
    if (!parsedGem) return null
    const apiGem = gemByGameId.get(gemGameId(parsedGem.id))
    return apiGem?.id ?? null
  }

  function mapWeapon(
    weapon: ParsedWeapon,
    inv: ParsedInventory,
    storage: "bag" | "container"
  ) {
    const parsedBlade = inv.blades.find((b) => b.index === weapon.bladeRef)
    if (!parsedBlade) {
      warnings.push(
        `Weapon "${weapon.name}": blade ref ${weapon.bladeRef} not found`
      )
      return
    }

    const apiBlade = bladeByGameId.get(bladeGameId(parsedBlade.id))
    if (!apiBlade) {
      warnings.push(
        `Weapon "${weapon.name}": blade ITEMNAME ${parsedBlade.id} not found`
      )
      return
    }

    // Resolve grip
    const parsedGrip = inv.grips.find((g) => g.index === weapon.gripRef)
    let apiGripId: number | null = null
    if (parsedGrip) {
      const apiGrip = gripByItemname.get(parsedGrip.id)
      if (apiGrip) {
        apiGripId = apiGrip.id
      } else {
        warnings.push(
          `Weapon "${weapon.name}": grip ITEMNAME ${parsedGrip.id} not found`
        )
      }
    }

    // Resolve gems
    const gem1 = resolveGemId(weapon.gemRefs[0] ?? 0, inv)
    const gem2 = resolveGemId(weapon.gemRefs[1] ?? 0, inv)
    const gem3 = resolveGemId(weapon.gemRefs[2] ?? 0, inv)

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
      item_id: apiBlade.id,
      material: MATERIAL_BY_ID[parsedBlade.materialId] ?? null,
      grip_id: apiGripId,
      gem_1_id: gem1,
      gem_2_id: gem2,
      gem_3_id: gem3,
      equip_slot: equipSlot,
      storage,
    })
  }

  function mapShield(shield: ParsedShield, storage: "bag" | "container") {
    const apiArmor = armorByGameId.get(armorGameId(shield.id))
    if (!apiArmor) {
      warnings.push(`Shield ITEMNAME ${shield.id} not found`)
      return
    }

    // Shield gems reference the parent inventory's gem array
    const inv = storage === "bag" ? slot.inventory : slot.container
    const gem1 = resolveGemId(shield.gemRefs[0] ?? 0, inv)
    const gem2 = resolveGemId(shield.gemRefs[1] ?? 0, inv)
    const gem3 = resolveGemId(shield.gemRefs[2] ?? 0, inv)

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
      item_id: apiArmor.id,
      material: MATERIAL_BY_ID[shield.materialId] ?? null,
      grip_id: null,
      gem_1_id: gem1,
      gem_2_id: gem2,
      gem_3_id: gem3,
      equip_slot: equipSlot,
      storage,
    })
  }

  function mapBlade(blade: ParsedBlade, storage: "bag" | "container") {
    const apiBlade = bladeByGameId.get(bladeGameId(blade.id))
    if (!apiBlade) {
      warnings.push(`Blade ITEMNAME ${blade.id} not found`)
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
    const apiGrip = gripByItemname.get(grip.id)
    if (!apiGrip) {
      warnings.push(`Grip ITEMNAME ${grip.id} not found`)
      return
    }

    items.push({
      item_type: "grip",
      item_id: apiGrip.id,
      storage,
    })
  }

  function mapArmor(armor: ParsedArmor, storage: "bag" | "container") {
    const apiArmor = armorByGameId.get(armorGameId(armor.id))
    if (!apiArmor) {
      warnings.push(`Armor ITEMNAME ${armor.id} not found`)
      return
    }

    // bodyPart == 0 means unequipped; non-zero = equipped in that slot.
    // RAM order (from Data Crystal): Accessory, R.Arm, L.Arm, Helm, Body, Legs
    // Save file uses 1-based: 1/2=Arms (R/L), 3=Head, 4=Body, 5=Legs, 6+=Accessory
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

    // Accessories don't have materials (materialId 0 = "Wood" is meaningless for them)
    const isAccessory = armor.id >= 223
    items.push({
      item_type: "armor",
      item_id: apiArmor.id,
      material: isAccessory ? null : (MATERIAL_BY_ID[armor.materialId] ?? null),
      equip_slot: equipSlot,
      storage,
    })
  }

  function mapGem(gem: ParsedGem, storage: "bag" | "container") {
    const apiGem = gemByGameId.get(gemGameId(gem.id))
    if (!apiGem) {
      warnings.push(`Gem ITEMNAME ${gem.id} not found`)
      return
    }

    items.push({
      item_type: "gem",
      item_id: apiGem.id,
      storage,
    })
  }

  function mapMisc(misc: ParsedMisc, storage: "bag" | "container") {
    // Try consumable range first (323-356)
    if (misc.id >= 323 && misc.id <= 356) {
      const apiConsumable = consumableByGameId.get(consumableGameId(misc.id))
      if (apiConsumable) {
        items.push({
          item_type: "consumable",
          item_id: apiConsumable.id,
          quantity: misc.quantity || 1,
          storage,
        })
        return
      }
    }

    // Gems can appear in misc slots (261-310)
    if (misc.id >= 261 && misc.id <= 310) {
      const apiGem = gemByGameId.get(gemGameId(misc.id))
      if (apiGem) {
        items.push({
          item_type: "gem",
          item_id: apiGem.id,
          quantity: misc.quantity || 1,
          storage,
        })
        return
      }
    }

    // Materials appear as misc items (254-260)
    // Grimoires and special items (386+) — skip with warning
    warnings.push(
      `Misc ITEMNAME ${misc.id}: unmapped (quantity: ${misc.quantity})`
    )
  }

  mapInventory(slot.inventory, "bag")
  mapInventory(slot.container, "container")

  return { items, warnings }
}
