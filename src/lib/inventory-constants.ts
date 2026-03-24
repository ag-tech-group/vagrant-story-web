import type { EquipSlot } from "@/lib/inventory-api"

export interface SlotConfig {
  key: EquipSlot
  label: string
  gridArea: string
  itemTypes: string[]
  isBlade?: boolean
  isShield?: boolean
  isAccessory?: boolean
}

export const EQUIP_SLOTS: SlotConfig[] = [
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

export const SLOT_LABELS: Record<string, string> = {
  right_hand: "R. Hand",
  left_hand: "L. Hand",
  head: "Head",
  body: "Body",
  legs: "Legs",
  arms: "Arms",
  accessory: "Accessory",
}

export const DISPLAY_TYPE_TO_CATEGORY: Record<string, string> = {
  Dagger: "Blade",
  Sword: "Blade",
  "Great Sword": "Blade",
  "Axe / Mace": "Blade",
  Staff: "Blade",
  "Heavy Mace": "Blade",
  Polearm: "Blade",
  Crossbow: "Blade",
  Grip: "Grip",
  Hilt: "Grip",
  Haft: "Grip",
  Shaft: "Grip",
  Bolt: "Grip",
  Shield: "Shield",
  Helm: "Helm",
  Body: "Body",
  Leg: "Leg",
  Arm: "Arm",
  Accessory: "Accessory",
  Gem: "Gem",
  Weapon: "Gem",
  Armor: "Gem",
  Both: "Gem",
  Consumable: "Consumable",
}
