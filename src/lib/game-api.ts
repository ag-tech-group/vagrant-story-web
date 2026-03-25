const API_URL = import.meta.env.VITE_API_URL || "/api"

export interface Blade {
  id: number
  game_id: number
  field_name: string
  name: string
  description_fr?: string
  wep_file_id?: number
  blade_type: string
  damage_type: string
  risk: number
  str: number
  int: number
  agi: number
  range: number
  damage: number
  hands: string
}

export interface Armor {
  id: number
  game_id: number
  field_name: string
  name: string
  description_fr?: string
  wep_file_id?: number
  armor_type: string
  str: number
  int: number
  agi: number
  gem_slots: number
  human: number
  beast: number
  undead: number
  phantom: number
  dragon: number
  evil: number
  fire: number
  water: number
  wind: number
  earth: number
  light: number
  dark: number
  blunt: number
  edged: number
  piercing: number
  physical: number
}

export interface Material {
  id: number
  name: string
  tier: number
  str_modifier: number
  int_modifier: number
  agi_modifier: number
  blade_str: number
  blade_int: number
  blade_agi: number
  shield_str: number
  shield_int: number
  shield_agi: number
  armor_str: number
  armor_int: number
  armor_agi: number
  human: number
  beast: number
  undead: number
  phantom: number
  dragon: number
  evil: number
  fire: number
  water: number
  wind: number
  earth: number
  light: number
  dark: number
}

export interface Gem {
  id: number
  game_id: number
  field_name: string
  name: string
  description_fr?: string
  description?: string
  magnitude: string
  affinity_type: string
  gem_type?: string
  str: number
  int: number
  agi: number
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

export interface Grip {
  id: number
  game_id: number
  field_name: string
  name: string
  description_fr?: string
  grip_type: string
  compatible_weapons: string
  str: number
  int: number
  agi: number
  blunt: number
  edged: number
  piercing: number
  gem_slots: number
  dp?: number
  pp?: number
}

export interface Consumable {
  id: number
  game_id: number
  field_name: string
  name: string
  description_fr?: string
  description?: string
  effects?: unknown
  hp_restore?: string
  mp_restore?: string
  risk_reduce?: string
  status_cure?: string
  permanent_stat?: string
  drop_rate?: string
  drop_location?: string
}

export interface Spell {
  id: number
  name: string
  category: string
  mp_cost: string
  targeting: string
  affinity: string
  effect: string
  grimoire: string
}

export interface Area {
  id: number
  name: string
}

export interface Room {
  id: number
  name: string
  area_id: number
  area_name: string
}

export interface AreaDetail {
  id: number
  name: string
  rooms: Room[]
}

export interface Key {
  id: number
  name: string
  area: string
  room: string
  room_id: number | null
  source: string
  locations_used: string
}

export interface Sigil {
  id: number
  name: string
  area: string
  room: string
  room_id: number | null
  source: string
  door_unlocks: string
}

export interface Grimoire {
  id: number
  name: string
  spell_name: string
  areas: string
  sources: string
  drop_rates: string
  repeatable: boolean
}

export interface GrimoireDetail {
  id: number
  name: string
  spell_name: string
  area: string
  room: string
  room_id: number | null
  source: string
  drop_rate: string
  repeatable: boolean
}

export interface Workshop {
  id: number
  name: string
  area: string
  room_id: number | null
  available_materials: string
  description: string
}

export interface Enemy {
  id: number
  name: string
  enemy_class: string
  hp: number
  mp: number
  str: number
  int: number
  agi: number
  movement: number
  is_boss: boolean
  encyclopaedia_number: number | null
  description: string
}

export interface EnemyBodyPart {
  id: number
  enemy_id: number
  name: string
  physical: number
  air: number
  fire: number
  earth: number
  water: number
  light: number
  dark: number
  blunt: number
  edged: number
  piercing: number
  evade: number
  chain_evade: number
}

export interface EnemyDrop {
  id: number
  enemy_id: number
  body_part: string
  item: string
  material: string
  drop_chance: string
  drop_value: number
  grip: string
  quantity: number
}

export interface EnemyEncounter {
  id: number
  enemy_id: number
  room_id: number
  room_name: string
  area_name: string
  condition: string
  attacks: string
}

export interface EnemyDetail extends Enemy {
  body_parts: EnemyBodyPart[]
  drops: EnemyDrop[]
  encounters: EnemyEncounter[]
}

export interface BreakArt {
  id: number
  name: string
  weapon_type: string
  hp_cost: number
  attack_multiplier: string
  damage_type: string
  affinity: string
  special_effect: string | null
  kills_required: number
}

export interface BattleAbility {
  id: number
  name: string
  ability_type: string
  risk_cost: number
  effect: string
  power: string
}

export interface Character {
  id: number
  name: string
  role: string
  description: string
}

export interface Title {
  id: number
  number: number
  name: string
  requirement: string
}

export interface Ranking {
  id: number
  level: number
  name: string
  requirement: string
}

export interface ChestItem {
  id: number
  chest_id: number
  item_type: string
  item_name: string
  material: string | null
  gem_slots: number | null
  quantity: number
}

export interface Chest {
  id: number
  area: string
  room: string
  room_id: number | null
  lock_type: string | null
}

export interface ChestDetail extends Chest {
  items: ChestItem[]
}

export interface CraftingRecipe {
  id: number
  category: string
  sub_category: string
  input_1: string
  input_2: string
  result: string
  tier_change: number
  has_swap: boolean
}

export interface MaterialRecipe {
  id: number
  category: string
  sub_category: string
  input_1: string
  input_2: string
  material_1: string
  material_2: string
  result_material: string
  tier_change: number
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const gameApi = {
  areas: () => fetchApi<Area[]>("/areas?limit=200"),
  area: (id: number) => fetchApi<AreaDetail>(`/areas/${id}`),
  rooms: () => fetchApi<Room[]>("/rooms?limit=500"),
  room: (id: number) => fetchApi<Room>(`/rooms/${id}`),
  blades: () => fetchApi<Blade[]>("/blades?limit=200"),
  blade: (id: number) => fetchApi<Blade>(`/blades/${id}`),
  armor: () => fetchApi<Armor[]>("/armor?limit=200"),
  armorItem: (id: number) => fetchApi<Armor>(`/armor/${id}`),
  materials: () => fetchApi<Material[]>("/materials"),
  gems: () => fetchApi<Gem[]>("/gems?limit=200"),
  grips: () => fetchApi<Grip[]>("/grips?limit=200"),
  consumables: () => fetchApi<Consumable[]>("/consumables?limit=200"),
  breakArts: () => fetchApi<BreakArt[]>("/break-arts?limit=200"),
  breakArt: (id: number) => fetchApi<BreakArt>(`/break-arts/${id}`),
  battleAbilities: () =>
    fetchApi<BattleAbility[]>("/battle-abilities?limit=200"),
  battleAbility: (id: number) =>
    fetchApi<BattleAbility>(`/battle-abilities/${id}`),
  spells: () => fetchApi<Spell[]>("/spells?limit=200"),
  spell: (id: number) => fetchApi<Spell>(`/spells/${id}`),
  keys: () => fetchApi<Key[]>("/keys?limit=200"),
  sigils: () => fetchApi<Sigil[]>("/sigils?limit=200"),
  grimoires: () => fetchApi<Grimoire[]>("/grimoires?limit=500"),
  grimoire: (id: number) => fetchApi<GrimoireDetail>(`/grimoires/${id}`),
  chests: () => fetchApi<Chest[]>("/chests?limit=500"),
  chest: (id: number) => fetchApi<ChestDetail>(`/chests/${id}`),
  workshops: () => fetchApi<Workshop[]>("/workshops?limit=200"),
  enemies: () => fetchApi<Enemy[]>("/enemies?limit=200"),
  enemy: (id: number) => fetchApi<EnemyDetail>(`/enemies/${id}`),
  characters: () => fetchApi<Character[]>("/characters?limit=200"),
  character: (id: number) => fetchApi<Character>(`/characters/${id}`),
  titles: () => fetchApi<Title[]>("/titles?limit=200"),
  title: (id: number) => fetchApi<Title>(`/titles/${id}`),
  rankings: () => fetchApi<Ranking[]>("/rankings?limit=200"),
  ranking: (id: number) => fetchApi<Ranking>(`/rankings/${id}`),
  craftingRecipes: (params?: string) =>
    fetchApi<CraftingRecipe[]>(
      `/crafting-recipes${params ? `?${params}` : "?limit=200"}`
    ),
  materialRecipes: (params?: string) =>
    fetchApi<MaterialRecipe[]>(
      `/crafting-recipes/materials${params ? `?${params}` : "?limit=200"}`
    ),
}

export function fmt(s: string) {
  return s.replace(/_/g, " ")
}
