const API_URL = import.meta.env.VITE_API_URL || "/api"

export type EquipSlot =
  | "right_hand"
  | "left_hand"
  | "head"
  | "body"
  | "legs"
  | "arms"
  | "accessory"

export interface InventoryListItem {
  id: number
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: number
  inventory_id: number
  item_type: string
  item_id: number
  material: string | null
  grip_id: number | null
  gem_1_id: number | null
  gem_2_id: number | null
  gem_3_id: number | null
  equip_slot: EquipSlot | null
  storage: "bag" | "container"
  quantity: number
}

export interface InventoryDetail extends InventoryListItem {
  base_hp: number | null
  base_mp: number | null
  base_str: number | null
  base_int: number | null
  base_agi: number | null
  items: InventoryItem[]
}

export interface CreateInventoryItem {
  item_type: string
  item_id: number
  material?: string | null
  grip_id?: number | null
  gem_1_id?: number | null
  gem_2_id?: number | null
  gem_3_id?: number | null
  equip_slot?: EquipSlot | null
  storage?: "bag" | "container"
  quantity?: number
}

export interface UpdateInventoryItem {
  item_type?: string
  item_id?: number
  material?: string | null
  grip_id?: number | null
  gem_1_id?: number | null
  gem_2_id?: number | null
  gem_3_id?: number | null
  equip_slot?: EquipSlot | null
  storage?: "bag" | "container"
  quantity?: number
}

async function fetchAuth<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API error ${res.status}: ${body}`)
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Loadout types ──────────────────────────────────────────────────

export interface LoadoutRequest {
  inventory_id: number
  enemy_id: number
  mode: "full" | "offense" | "defense"
  include_equipped: boolean
  include_bag: boolean
  include_container: boolean
  include_2h: boolean
}

export interface LoadoutWeapon {
  blade_name: string
  blade_type: string
  grip_name: string | null
  material: string
  damage_type: string
  hands: string
}

export interface LoadoutArmor {
  slot: string
  item_name: string
  armor_type: string
  material: string
}

export interface LoadoutStats {
  estimated_damage: number
  target_body_part: string
  target_reason: string
}

export interface LoadoutCombinedStats {
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
}

export interface LoadoutResult {
  rank: number
  score: number
  offense_score: number | null
  defense_score: number | null
  weapon: LoadoutWeapon | null
  armor: LoadoutArmor[] | null
  stats: LoadoutStats
  combined_stats: LoadoutCombinedStats | null
}

export interface LoadoutEnemyInfo {
  id: number
  name: string
  enemy_class: string
  hp: number
  mp: number
}

export interface LoadoutResponse {
  enemy: LoadoutEnemyInfo
  loadouts: LoadoutResult[]
}

export const loadoutApi = {
  optimize: (req: LoadoutRequest) =>
    fetchAuth<LoadoutResponse>("/loadout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }),
}

export const inventoryApi = {
  list: () => fetchAuth<InventoryListItem[]>("/user/inventories"),

  get: (id: number) => fetchAuth<InventoryDetail>(`/user/inventories/${id}`),

  create: (name: string) =>
    fetchAuth<InventoryDetail>("/user/inventories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  update: (id: number, name: string) =>
    fetchAuth<InventoryDetail>(`/user/inventories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  delete: (id: number) =>
    fetchAuth<void>(`/user/inventories/${id}`, { method: "DELETE" }),

  addItem: (inventoryId: number, item: CreateInventoryItem) =>
    fetchAuth<InventoryItem>(`/user/inventories/${inventoryId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }),

  updateItem: (
    inventoryId: number,
    itemId: number,
    item: UpdateInventoryItem
  ) =>
    fetchAuth<InventoryItem>(
      `/user/inventories/${inventoryId}/items/${itemId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }
    ),

  deleteItem: (inventoryId: number, itemId: number) =>
    fetchAuth<void>(`/user/inventories/${inventoryId}/items/${itemId}`, {
      method: "DELETE",
    }),

  importItems: (
    inventoryId: number,
    items: CreateInventoryItem[],
    clearExisting: boolean = false,
    characterStats?: {
      base_hp: number
      base_mp: number
      base_str: number
      base_int: number
      base_agi: number
    }
  ) =>
    fetchAuth<InventoryDetail>(`/user/inventories/${inventoryId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        clear_existing: clearExisting,
        ...characterStats,
      }),
    }),
}
