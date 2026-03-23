/**
 * Vagrant Story Memory Card Parser
 *
 * Parses PS1 memory card images (.srm/.mcd/.mcr) containing Vagrant Story save data.
 * Decrypts the LCG stream cipher, validates checksums, and extracts full inventory
 * and character data.
 *
 * The parser returns game_item_ids (ITEMNAME.BIN indices) rather than resolved names.
 * The frontend maps these to API items using existing game data queries.
 *
 * Supported formats:
 *   .srm / .mcd / .mcr  - Raw 128KB PS1 memory card images
 *   .psv                 - Not supported (PS3 single-save format)
 */

// ── Constants ────────────────────────────────────────────────────────

const BLOCK_SIZE = 8192 // 8 KB per block
const CARD_SIZE = 131072 // 128 KB total (16 blocks)
const VS_SAVE_SIZE = 0x5c00 // 23,552 bytes of actual save data
const VS_BLOCKS_PER_SAVE = 3 // 3 blocks = 24,576 bytes allocated
const MAGIC_VALUE = 0x20000107 // Post-decryption validation marker
const LCG_MULTIPLIER = 0x19660d // Numerical Recipes LCG multiplier

const MATERIALS = [
  "Wood",
  "Leather",
  "Bronze",
  "Iron",
  "Silver",
  "Hagane",
  "Damascus",
] as const

// ── Types ────────────────────────────────────────────────────────────

export interface ParsedSaveSlot {
  slotNumber: number
  zoneId: number
  roomId: number
  gameTime: string // "HH:MM:SS"
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  saveCount: number
  clearCount: number // NG+ counter
  mapCompletion: number
  checksumValid: boolean
  checksumErrors: string[]
  inventory: ParsedInventory
  container: ParsedInventory
}

export interface ParsedInventory {
  weapons: ParsedWeapon[]
  shields: ParsedShield[]
  blades: ParsedBlade[]
  grips: ParsedGrip[]
  armor: ParsedArmor[]
  gems: ParsedGem[]
  misc: ParsedMisc[]
}

export interface ParsedWeapon {
  /** Slot index within the weapon table */
  index: number
  /** 1-based index into the blade table */
  bladeRef: number
  /** 1-based index into the grip table */
  gripRef: number
  isEquipped: boolean
  /** 1-based indices into the gem table (0 = empty slot) */
  gemRefs: number[]
  /** Game-encoded weapon name */
  name: string
}

export interface ParsedShield {
  /** Slot index within the shield table */
  index: number
  isEquipped: boolean
  /** ITEMNAME.BIN index (128-142) */
  id: number
  subId: number
  category: number
  maxDp: number
  maxPp: number
  currentDp: number
  currentPp: number
  gemSlots: number
  strength: number
  intelligence: number
  agility: number
  damageTypes: number[]
  classes: number[]
  affinities: number[]
  materialId: number
  material: string
  bodyPart: number
  /** 1-based indices into the gem table (0 = empty slot) */
  gemRefs: number[]
}

export interface ParsedBlade {
  /** ITEMNAME.BIN index (1-90) */
  id: number
  subId: number
  wepId: number
  category: number
  maxDp: number
  maxPp: number
  currentDp: number
  currentPp: number
  strength: number
  intelligence: number
  agility: number
  cost: number
  /** Human/Beast/Undead/Phantom/Dragon/Evil */
  classes: number[]
  /** Fire/Water/Wind/Earth/Light/Dark/Physical */
  affinities: number[]
  materialId: number
  material: string
  /** 1-based; which assembled weapon this blade belongs to (0 = loose) */
  weaponRef: number
  /** Slot index within the blade table */
  index: number
}

export interface ParsedGrip {
  /** ITEMNAME.BIN index (96-126) */
  id: number
  subId: number
  category: number
  gemSlots: number
  strength: number
  intelligence: number
  agility: number
  /** Blunt/Edged/Piercing/Phantom */
  damageTypes: number[]
  /** 1-based; which assembled weapon this grip belongs to (0 = loose) */
  weaponRef: number
  /** Slot index within the grip table */
  index: number
}

export interface ParsedArmor {
  /** ITEMNAME.BIN index */
  id: number
  subId: number
  category: number
  maxDp: number
  maxPp: number
  currentDp: number
  currentPp: number
  gemSlots: number
  strength: number
  intelligence: number
  agility: number
  /** Blunt/Edged/Piercing/Phantom */
  damageTypes: number[]
  /** Human/Beast/Undead/Phantom/Dragon/Evil */
  classes: number[]
  /** Fire/Water/Wind/Earth/Light/Dark/Physical */
  affinities: number[]
  materialId: number
  material: string
  /** Body part slot: 0=Shield, 1=Helm, 2=Body, 3=Arms, 4=Legs, 5=Accessory */
  bodyPart: number
  /** Slot index within the armor table */
  index: number
}

export interface ParsedGem {
  /** ITEMNAME.BIN index (261-310) */
  id: number
  gemEffects: number
  strength: number
  intelligence: number
  agility: number
  /** Human/Beast/Undead/Phantom/Dragon/Evil */
  classes: number[]
  /** Fire/Water/Wind/Earth/Light/Dark/Physical */
  affinities: number[]
  /** Weapon/shield this gem is attached to (0 = loose) */
  setItemRef: number
  /** Slot index within the gem table */
  index: number
}

export interface ParsedMisc {
  /** ITEMNAME.BIN index */
  id: number
  quantity: number
  /** Slot index within the misc table */
  index: number
}

// ── Text Decoding ────────────────────────────────────────────────────
// Vagrant Story uses a custom text encoding for item names and save titles.

const CHAR_MAP = new Map<number, string | null>()

// 0-9 digits
for (let i = 0; i < 10; i++) {
  CHAR_MAP.set(i, String(i))
}
// A-Z uppercase
for (let i = 0; i < 26; i++) {
  CHAR_MAP.set(0x0a + i, String.fromCharCode(0x41 + i))
}
// a-z lowercase
for (let i = 0; i < 26; i++) {
  CHAR_MAP.set(0x24 + i, String.fromCharCode(0x61 + i))
}
CHAR_MAP.set(0xe7, null) // string terminator
CHAR_MAP.set(0xfa, " ") // space (2-byte: FA + param)
CHAR_MAP.set(0x96, "'") // apostrophe

/**
 * Decode Vagrant Story's custom text encoding to ASCII.
 */
function decodeGameText(data: Uint8Array): string {
  const result: string[] = []
  let i = 0
  while (i < data.length) {
    const b = data[i]
    if (b === 0xe7) break
    if (b === 0xfa) {
      result.push(" ")
      i += 2 // skip the space parameter byte
      continue
    }
    const ch = CHAR_MAP.get(b)
    if (ch !== undefined && ch !== null) {
      result.push(ch)
    }
    i++
  }
  return result.join("")
}

// ── Memory Card Directory ────────────────────────────────────────────

interface DirectoryEntry {
  blockIndex: number
  stateCode: number
  productCode: string
  saveSlot: number | null
}

/**
 * Parse the memory card directory (block 0, entries at 0x80-0x7FF).
 * Returns entries for all 15 possible file slots.
 */
function parseDirectory(view: DataView): DirectoryEntry[] {
  const entries: DirectoryEntry[] = []

  for (let i = 0; i < 15; i++) {
    const off = 0x80 + i * 0x80
    const stateCode = view.getUint8(off)

    // Read product code as ASCII (20 bytes at offset +0x0A)
    const productBytes = new Uint8Array(
      view.buffer,
      view.byteOffset + off + 0x0a,
      20
    )
    let productCode = ""
    for (let j = 0; j < productBytes.length; j++) {
      if (productBytes[j] === 0) break
      productCode += String.fromCharCode(productBytes[j])
    }

    // Check if this is a VS save slot
    let saveSlot: number | null = null
    if (productCode.includes("BASLUS-01040VAG")) {
      const lastChar = productCode[productCode.length - 1]
      if (lastChar >= "0" && lastChar <= "9") {
        saveSlot = parseInt(lastChar, 10)
      }
    }

    entries.push({
      blockIndex: i + 1,
      stateCode,
      productCode,
      saveSlot,
    })
  }

  return entries
}

/**
 * Find all Vagrant Story save slots in the memory card directory.
 * Returns a map of slot number -> byte offset of the first data block.
 */
function findVsSaveBlocks(view: DataView): Map<number, number> {
  const entries = parseDirectory(view)
  const saves = new Map<number, number>()

  for (const entry of entries) {
    // 0x51 = "first" block of a multi-block file
    if (entry.stateCode === 0x51 && entry.saveSlot !== null) {
      saves.set(entry.saveSlot, entry.blockIndex * BLOCK_SIZE)
    }
  }

  return saves
}

// ── Encryption / Decryption ──────────────────────────────────────────

/**
 * Decrypt a VS save slot using the LCG stream cipher.
 *
 * Bytes 0x0000-0x0183 are unencrypted (icon header + encryption key).
 * Bytes 0x0184 onwards are encrypted with the LCG cipher.
 *
 * Uses Math.imul for correct unsigned 32-bit multiplication, since standard
 * JavaScript multiplication loses precision for large 32-bit values.
 */
function decryptSaveData(raw: DataView): Uint8Array {
  const size = Math.min(raw.byteLength, VS_SAVE_SIZE)
  const data = new Uint8Array(size)

  // Copy raw bytes
  for (let i = 0; i < size; i++) {
    data[i] = raw.getUint8(i)
  }

  // Read encryption key at offset 0x180 (little-endian uint32, unencrypted)
  const key = raw.getUint32(0x180, true)

  // Decrypt from offset 0x184 onward
  let state = key
  for (let i = 0x184; i < size; i++) {
    // Unsigned 32-bit multiply: Math.imul handles overflow correctly,
    // >>> 0 converts the signed result back to unsigned
    state = Math.imul(state, LCG_MULTIPLIER) >>> 0
    data[i] = (data[i] - (state >>> 24)) & 0xff
  }

  return data
}

// ── Validation ───────────────────────────────────────────────────────

/**
 * Validate the magic value at offset 0x018C after decryption.
 * Must be 0x20000107 for a valid VS save.
 */
function validateMagic(view: DataView): boolean {
  const magic = view.getUint32(0x18c, true)
  return magic === MAGIC_VALUE
}

/**
 * Verify XOR checksums per 256-byte sector.
 * Returns [isValid, errorMessages].
 */
function validateChecksums(data: Uint8Array): [boolean, string[]] {
  const errors: string[] = []

  for (let i = 0; i < 92; i++) {
    let xorVal = 0
    const sectorStart = i * 256
    for (let j = 0; j < 256; j++) {
      xorVal ^= data[sectorStart + j]
    }

    if (i === 1) {
      // Sector 1 is special: XOR of all 256 bytes must be 0
      if (xorVal !== 0) {
        errors.push(
          `Sector 1 XOR check failed (got 0x${xorVal.toString(16).padStart(2, "0")}, expected 0x00)`
        )
      }
    } else {
      // Compare against stored checksum at 0x1A4 + i
      const expected = data[0x1a4 + i] & 0xff
      const actual = xorVal & 0xff
      if (actual !== expected) {
        errors.push(
          `Sector ${i} checksum mismatch (got 0x${actual.toString(16).padStart(2, "0")}, expected 0x${expected.toString(16).padStart(2, "0")})`
        )
      }
    }
  }

  return [errors.length === 0, errors]
}

// ── Save Summary ─────────────────────────────────────────────────────

interface SaveSummary {
  gameTime: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  saveCount: number
  clearCount: number
  mapCompletion: number
}

/**
 * Parse save summary stats from offset 0x0190.
 */
function parseSaveSummary(view: DataView): SaveSummary {
  const hours = view.getUint8(0x193)
  const minutes = view.getUint8(0x192)
  const seconds = view.getUint8(0x191)

  const gameTime = `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  return {
    gameTime,
    hp: view.getUint16(0x198, true),
    maxHp: view.getUint16(0x19a, true),
    mp: view.getUint16(0x1a0, true),
    maxMp: view.getUint16(0x1a2, true),
    saveCount: view.getUint16(0x194, true),
    clearCount: view.getUint8(0x19d),
    mapCompletion: view.getUint8(0x19e),
  }
}

// ── Material Lookup ──────────────────────────────────────────────────

function getMaterialName(materialId: number): string {
  if (materialId >= 0 && materialId < MATERIALS.length) {
    return MATERIALS[materialId]
  }
  return `unknown(${materialId})`
}

// ── Inventory Parsers ────────────────────────────────────────────────

/**
 * Parse weapon assembly entries (32 bytes each).
 * Weapons reference blades, grips, and gems by 1-based slot index.
 */
function parseWeapons(
  data: Uint8Array,
  _view: DataView,
  baseOffset: number,
  count: number
): ParsedWeapon[] {
  const weapons: ParsedWeapon[] = []

  for (let i = 0; i < count; i++) {
    const off = baseOffset + i * 32

    // Empty slot: blade_ref and grip_ref are both 0
    const bladeRef = data[off + 1]
    const gripRef = data[off + 2]
    if (bladeRef === 0 && gripRef === 0) continue

    // Decode the game-encoded weapon name (24 bytes at +8)
    const nameBytes = data.subarray(off + 8, off + 32)
    const name = decodeGameText(nameBytes)
    if (!name) {
      // Check if the entire entry is zeroed
      let allZero = true
      for (let j = 0; j < 32; j++) {
        if (data[off + j] !== 0) {
          allZero = false
          break
        }
      }
      if (allZero) continue
    }

    weapons.push({
      index: data[off],
      bladeRef,
      gripRef,
      isEquipped: data[off + 3] === 1,
      gemRefs: [data[off + 4], data[off + 5], data[off + 6], data[off + 7]],
      name: name || `[unnamed weapon slot ${i}]`,
    })
  }

  return weapons
}

/**
 * Parse shield entries (48 bytes each).
 * Shield = 4-byte header + 40-byte armor struct + 4-byte gem refs.
 */
function parseShields(
  data: Uint8Array,
  view: DataView,
  baseOffset: number,
  count: number
): ParsedShield[] {
  const shields: ParsedShield[] = []

  for (let i = 0; i < count; i++) {
    const off = baseOffset + i * 48

    // The armor id is at the start of the embedded armor struct (+4)
    const armorId = data[off + 4]
    if (armorId === 0) continue

    // Embedded armor struct starts at off+4, 40 bytes
    const a = off + 4

    shields.push({
      index: data[off],
      isEquipped: data[off + 1] === 1,
      id: armorId,
      subId: data[a + 1],
      category: data[a + 3],
      maxDp: view.getUint16(a + 4, true),
      maxPp: view.getUint16(a + 6, true),
      currentDp: view.getUint16(a + 8, true),
      currentPp: view.getUint16(a + 10, true),
      gemSlots: data[a + 12],
      strength: view.getInt8(a + 13),
      intelligence: view.getInt8(a + 14),
      agility: view.getInt8(a + 15),
      damageTypes: [
        view.getInt8(a + 0x10),
        view.getInt8(a + 0x11),
        view.getInt8(a + 0x12),
        view.getInt8(a + 0x13),
      ],
      classes: [
        view.getInt8(a + 0x14),
        view.getInt8(a + 0x15),
        view.getInt8(a + 0x16),
        view.getInt8(a + 0x17),
        view.getInt8(a + 0x18),
        view.getInt8(a + 0x19),
      ],
      affinities: [
        view.getInt8(a + 0x1c),
        view.getInt8(a + 0x1d),
        view.getInt8(a + 0x1e),
        view.getInt8(a + 0x1f),
        view.getInt8(a + 0x20),
        view.getInt8(a + 0x21),
        view.getInt8(a + 0x22),
      ],
      materialId: view.getUint16(a + 0x24, true),
      material: getMaterialName(view.getUint16(a + 0x24, true)),
      bodyPart: data[a + 0x26],
      gemRefs: [
        data[off + 0x2c],
        data[off + 0x2d],
        data[off + 0x2e],
        data[off + 0x2f],
      ],
    })
  }

  return shields
}

/**
 * Parse blade entries (44 bytes each).
 * Blades define the weapon's offensive capabilities (damage, affinities, material).
 */
function parseBlades(
  data: Uint8Array,
  view: DataView,
  baseOffset: number,
  count: number
): ParsedBlade[] {
  const blades: ParsedBlade[] = []

  for (let i = 0; i < count; i++) {
    const off = baseOffset + i * 44

    const itemId = data[off]
    if (itemId === 0) continue

    const materialId = view.getUint16(off + 0x28, true)

    blades.push({
      id: itemId,
      subId: data[off + 1],
      wepId: data[off + 2],
      category: data[off + 3],
      maxDp: view.getUint16(off + 4, true),
      maxPp: view.getUint16(off + 6, true),
      currentDp: view.getUint16(off + 8, true),
      currentPp: view.getUint16(off + 10, true),
      strength: view.getInt8(off + 12),
      intelligence: view.getInt8(off + 13),
      agility: view.getInt8(off + 14),
      cost: data[off + 15],
      classes: [
        view.getInt8(off + 0x18),
        view.getInt8(off + 0x19),
        view.getInt8(off + 0x1a),
        view.getInt8(off + 0x1b),
        view.getInt8(off + 0x1c),
        view.getInt8(off + 0x1d),
      ],
      affinities: [
        view.getInt8(off + 0x20),
        view.getInt8(off + 0x21),
        view.getInt8(off + 0x22),
        view.getInt8(off + 0x23),
        view.getInt8(off + 0x24),
        view.getInt8(off + 0x25),
        view.getInt8(off + 0x26),
      ],
      materialId,
      material: getMaterialName(materialId),
      weaponRef: data[off + 0x2a],
      index: data[off + 0x2b],
    })
  }

  return blades
}

/**
 * Parse grip entries (16 bytes each).
 * Grips define gem slots, damage types, and minor stat bonuses.
 */
function parseGrips(
  data: Uint8Array,
  view: DataView,
  baseOffset: number,
  count: number
): ParsedGrip[] {
  const grips: ParsedGrip[] = []

  for (let i = 0; i < count; i++) {
    const off = baseOffset + i * 16

    const itemId = view.getUint16(off, true)
    if (itemId === 0) continue

    grips.push({
      id: itemId,
      subId: data[off + 2],
      category: data[off + 3],
      gemSlots: data[off + 4],
      strength: view.getInt8(off + 5),
      intelligence: view.getInt8(off + 6),
      agility: view.getInt8(off + 7),
      damageTypes: [
        view.getInt8(off + 8),
        view.getInt8(off + 9),
        view.getInt8(off + 10),
        view.getInt8(off + 11),
      ],
      weaponRef: view.getUint16(off + 12, true),
      index: view.getUint16(off + 14, true),
    })
  }

  return grips
}

/**
 * Parse armor entries (40 bytes each).
 * Used for helms, body armor, legs, arms, and accessories.
 */
function parseArmor(
  data: Uint8Array,
  view: DataView,
  baseOffset: number,
  count: number
): ParsedArmor[] {
  const armorList: ParsedArmor[] = []

  for (let i = 0; i < count; i++) {
    const off = baseOffset + i * 40

    const itemId = data[off]
    if (itemId === 0) continue

    const materialId = view.getUint16(off + 0x24, true)

    armorList.push({
      id: itemId,
      subId: data[off + 1],
      category: data[off + 3],
      maxDp: view.getUint16(off + 4, true),
      maxPp: view.getUint16(off + 6, true),
      currentDp: view.getUint16(off + 8, true),
      currentPp: view.getUint16(off + 10, true),
      gemSlots: data[off + 12],
      strength: view.getInt8(off + 13),
      intelligence: view.getInt8(off + 14),
      agility: view.getInt8(off + 15),
      damageTypes: [
        view.getInt8(off + 0x10),
        view.getInt8(off + 0x11),
        view.getInt8(off + 0x12),
        view.getInt8(off + 0x13),
      ],
      classes: [
        view.getInt8(off + 0x14),
        view.getInt8(off + 0x15),
        view.getInt8(off + 0x16),
        view.getInt8(off + 0x17),
        view.getInt8(off + 0x18),
        view.getInt8(off + 0x19),
      ],
      affinities: [
        view.getInt8(off + 0x1c),
        view.getInt8(off + 0x1d),
        view.getInt8(off + 0x1e),
        view.getInt8(off + 0x1f),
        view.getInt8(off + 0x20),
        view.getInt8(off + 0x21),
        view.getInt8(off + 0x22),
      ],
      materialId,
      material: getMaterialName(materialId),
      bodyPart: data[off + 0x26],
      index: data[off + 0x27],
    })
  }

  return armorList
}

/**
 * Parse gem entries (28 bytes each).
 * Gems provide stat bonuses and can be socketed into weapons/shields.
 */
function parseGems(
  data: Uint8Array,
  view: DataView,
  baseOffset: number,
  count: number
): ParsedGem[] {
  const gems: ParsedGem[] = []

  for (let i = 0; i < count; i++) {
    const off = baseOffset + i * 28

    const itemId = view.getUint16(off, true)
    if (itemId === 0) continue

    gems.push({
      id: itemId,
      gemEffects: data[off + 4],
      strength: view.getInt8(off + 5),
      intelligence: view.getInt8(off + 6),
      agility: view.getInt8(off + 7),
      classes: [
        view.getInt8(off + 8),
        view.getInt8(off + 9),
        view.getInt8(off + 10),
        view.getInt8(off + 11),
        view.getInt8(off + 12),
        view.getInt8(off + 13),
      ],
      affinities: [
        view.getInt8(off + 0x10),
        view.getInt8(off + 0x11),
        view.getInt8(off + 0x12),
        view.getInt8(off + 0x13),
        view.getInt8(off + 0x14),
        view.getInt8(off + 0x15),
        view.getInt8(off + 0x16),
      ],
      setItemRef: view.getUint16(off + 0x18, true),
      index: view.getInt16(off + 0x1a, true),
    })
  }

  return gems
}

/**
 * Parse misc item entries (4 bytes each).
 * Consumables, grimoires, keys, sigils, and materials.
 */
function parseMisc(
  data: Uint8Array,
  view: DataView,
  baseOffset: number,
  count: number
): ParsedMisc[] {
  const items: ParsedMisc[] = []

  for (let i = 0; i < count; i++) {
    const off = baseOffset + i * 4

    const itemId = view.getUint16(off, true)
    if (itemId === 0) continue

    items.push({
      id: itemId,
      quantity: data[off + 2],
      index: data[off + 3],
    })
  }

  return items
}

// ── Inventory Table Offsets ──────────────────────────────────────────

// [offset, count] tuples for each inventory type
interface InventoryLayout {
  weapons: [number, number]
  shields: [number, number]
  blades: [number, number]
  grips: [number, number]
  armor: [number, number]
  gems: [number, number]
  misc: [number, number]
}

// Active inventory at offset 0x07C8 in save data
const ACTIVE_LAYOUT: InventoryLayout = {
  weapons: [0x07c8 + 0x000, 8],
  shields: [0x07c8 + 0x100, 8],
  blades: [0x07c8 + 0x280, 16],
  grips: [0x07c8 + 0x540, 16],
  armor: [0x07c8 + 0x640, 16],
  gems: [0x07c8 + 0x8c0, 48],
  misc: [0x07c8 + 0xe00, 64],
}

// Container at offset 0x1DE0 in save data
const CONTAINER_LAYOUT: InventoryLayout = {
  weapons: [0x1de0 + 0x000, 32],
  shields: [0x1de0 + 0x400, 32],
  blades: [0x1de0 + 0xa00, 64],
  grips: [0x1de0 + 0x1500, 64],
  armor: [0x1de0 + 0x1900, 64],
  gems: [0x1de0 + 0x2300, 192],
  misc: [0x1de0 + 0x3800, 256],
}

/**
 * Parse a full inventory section (active or container) from decrypted save data.
 */
function parseInventory(
  data: Uint8Array,
  view: DataView,
  layout: InventoryLayout
): ParsedInventory {
  return {
    weapons: parseWeapons(data, view, layout.weapons[0], layout.weapons[1]),
    shields: parseShields(data, view, layout.shields[0], layout.shields[1]),
    blades: parseBlades(data, view, layout.blades[0], layout.blades[1]),
    grips: parseGrips(data, view, layout.grips[0], layout.grips[1]),
    armor: parseArmor(data, view, layout.armor[0], layout.armor[1]),
    gems: parseGems(data, view, layout.gems[0], layout.gems[1]),
    misc: parseMisc(data, view, layout.misc[0], layout.misc[1]),
  }
}

// ── Slot Parsing ─────────────────────────────────────────────────────

/**
 * Parse a single VS save slot from the memory card.
 *
 * @param cardView - DataView over the full 128KB memory card
 * @param slotNumber - Save slot number (1-5)
 * @param blockOffset - Byte offset of the first block in the card
 * @returns Parsed save slot data
 * @throws Error if the save data is corrupt or cannot be decrypted
 */
function parseSaveSlot(
  cardView: DataView,
  slotNumber: number,
  blockOffset: number
): ParsedSaveSlot {
  // Extract 3 blocks (24,576 bytes) starting at blockOffset
  const rawSize = VS_BLOCKS_PER_SAVE * BLOCK_SIZE
  if (blockOffset + rawSize > cardView.byteLength) {
    throw new Error(
      `Slot ${slotNumber}: insufficient data (card ends at ${cardView.byteLength}, ` +
        `need ${blockOffset + rawSize})`
    )
  }

  // Validate icon header magic ("SC")
  const sc1 = cardView.getUint8(blockOffset)
  const sc2 = cardView.getUint8(blockOffset + 1)
  if (sc1 !== 0x53 || sc2 !== 0x43) {
    throw new Error(`Slot ${slotNumber}: invalid icon header (no SC magic)`)
  }

  // Create a view over just this slot's raw data for decryption
  const rawSlotView = new DataView(
    cardView.buffer,
    cardView.byteOffset + blockOffset,
    Math.min(rawSize, VS_SAVE_SIZE)
  )

  // Decrypt the save data
  const decrypted = decryptSaveData(rawSlotView)
  const decView = new DataView(
    decrypted.buffer,
    decrypted.byteOffset,
    decrypted.byteLength
  )

  // Validate magic value
  if (!validateMagic(decView)) {
    const actual = decView.getUint32(0x18c, true)
    throw new Error(
      `Slot ${slotNumber}: magic value mismatch after decryption ` +
        `(got 0x${actual.toString(16).padStart(8, "0")}, expected 0x${MAGIC_VALUE.toString(16).padStart(8, "0")}). ` +
        `Save data may be corrupt.`
    )
  }

  // Validate checksums and surface errors to the caller
  const [checksumValid, checksumErrors] = validateChecksums(decrypted)
  if (!checksumValid) {
    console.warn(
      `Slot ${slotNumber}: ${checksumErrors.length} checksum error(s):`,
      checksumErrors
    )
  }

  // Extract zone + room IDs from decrypted save data at offset 0x1778
  // (D_80061068_t struct: zndId at +0, roomId at +1)
  const zoneId = decrypted[0x1778]
  const roomId = decrypted[0x1779]

  // Parse save summary
  const summary = parseSaveSummary(decView)

  // Parse active inventory and workshop container
  const inventory = parseInventory(decrypted, decView, ACTIVE_LAYOUT)
  const container = parseInventory(decrypted, decView, CONTAINER_LAYOUT)

  return {
    slotNumber,
    zoneId,
    roomId,
    gameTime: summary.gameTime,
    hp: summary.hp,
    maxHp: summary.maxHp,
    mp: summary.mp,
    maxMp: summary.maxMp,
    saveCount: summary.saveCount,
    clearCount: summary.clearCount,
    mapCompletion: summary.mapCompletion,
    checksumValid,
    checksumErrors,
    inventory,
    container,
  }
}

// ── Main Export ───────────────────────────────────────────────────────

/**
 * Parse a PS1 memory card image and extract all Vagrant Story save slots.
 *
 * Takes a raw file ArrayBuffer (from `<input type="file">` or drag-and-drop)
 * and returns all valid VS save slots found.
 *
 * Supported formats: .srm, .mcd, .mcr (all raw 128KB).
 * For .psv files, throw a clear error — they use a different format.
 *
 * @param buffer - Raw file contents as ArrayBuffer
 * @returns Array of parsed save slots
 * @throws Error if the file is invalid, wrong size, or contains no VS saves
 *
 * @example
 * ```ts
 * const file = event.target.files[0]
 * const buffer = await file.arrayBuffer()
 * const saves = parseMemoryCard(buffer)
 * for (const save of saves) {
 *   console.log(`Slot ${save.slotNumber}: ${save.gameTime}, HP ${save.hp}/${save.maxHp}`)
 * }
 * ```
 */
export function parseMemoryCard(buffer: ArrayBuffer): ParsedSaveSlot[] {
  // Validate file size
  if (buffer.byteLength !== CARD_SIZE) {
    throw new Error(
      `Invalid memory card file: expected ${CARD_SIZE} bytes (128 KB), ` +
        `got ${buffer.byteLength} bytes. ` +
        `Make sure the file is a raw PS1 memory card image (.srm, .mcd, or .mcr).`
    )
  }

  const cardView = new DataView(buffer)

  // Find all VS save slots in the directory
  const saves = findVsSaveBlocks(cardView)

  if (saves.size === 0) {
    throw new Error(
      "No Vagrant Story save data found in this memory card. " +
        "The card may not contain any VS saves, or the directory may be corrupt."
    )
  }

  // Parse each found slot, collecting results and skipping corrupt ones
  const results: ParsedSaveSlot[] = []
  const sortedSlots = [...saves.entries()].sort(([a], [b]) => a - b)

  for (const [slotNumber, blockOffset] of sortedSlots) {
    try {
      const slot = parseSaveSlot(cardView, slotNumber, blockOffset)
      results.push(slot)
    } catch (err) {
      console.warn(
        `Failed to parse save slot ${slotNumber}:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  if (results.length === 0) {
    throw new Error(
      "Found VS save entries in the memory card directory, but all slots " +
        "failed to parse. The save data may be corrupt."
    )
  }

  return results
}

/**
 * Check whether a filename suggests a .psv file (PS3 single-save format).
 * Call this before parseMemoryCard to give a better error message.
 */
export function isPsvFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".psv")
}

/**
 * Error message for .psv files.
 */
export const PSV_ERROR_MESSAGE =
  ".psv (PS3 single-save) format is not supported. " +
  "Please use a raw PS1 memory card image (.srm, .mcd, or .mcr) instead."
