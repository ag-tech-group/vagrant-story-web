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
  quantity: number
}

export interface InventoryDetail extends InventoryListItem {
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
}
