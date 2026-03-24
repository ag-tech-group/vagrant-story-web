/**
 * Crafting Optimizer Algorithm
 *
 * Given a player's inventory, finds optimal multi-step crafting paths
 * to reach a target item+material. Pure functions, no React dependencies.
 *
 * Crafting is two-stage:
 * 1. Item recipe: input_1 + input_2 → result_item (from CraftingRecipe)
 * 2. Material recipe: type_1(mat_A) + type_2(mat_B) → result_material (from MaterialRecipe)
 *
 * Both inputs are destroyed; one new item is created with no history.
 */

import type {
  Armor,
  Blade,
  CraftingRecipe,
  MaterialRecipe,
} from "@/lib/game-api"
import type { InventoryItem } from "@/lib/inventory-api"

// ── Types ────────────────────────────────────────────────────────────

/** A single item in the optimizer's working set */
export interface CraftableItem {
  /** Inventory item ID (negative for synthesized items not yet in inventory) */
  id: number
  /** Display name (e.g. "Hand Axe") */
  name: string
  /** Category: "blade", "armor", "shield" */
  category: string
  /** Equipment sub-type for material recipes (e.g. "Dagger", "Helm", "Shield") */
  equipType: string
  /** Material name (e.g. "Damascus") */
  material: string
  /** Original inventory item reference, null for synthesized */
  sourceItem: InventoryItem | null
}

export interface CraftingStep {
  input1: CraftableItem
  input2: CraftableItem
  result: CraftableItem
  recipe: CraftingRecipe
  materialRecipe: MaterialRecipe | null
  swapped: boolean
}

export interface CraftingPath {
  steps: CraftingStep[]
  result: CraftableItem
  consumedItems: CraftableItem[]
  score: number
}

export interface OptimizerConfig {
  maxDepth: number
  maxResults: number
  maxStates: number
  excludeItemIds: Set<number>
}

const DEFAULT_CONFIG: OptimizerConfig = {
  maxDepth: 4,
  maxResults: 20,
  maxStates: 5000,
  excludeItemIds: new Set(),
}

// ── Material tier for scoring ────────────────────────────────────────

export const MATERIAL_TIER: Record<string, number> = {
  Wood: 0,
  Leather: 1,
  Bronze: 2,
  Iron: 3,
  Hagane: 4,
  Silver: 5,
  Damascus: 6,
}

// ── Index builders ───────────────────────────────────────────────────

export interface RecipeIndex {
  /** Map "input1_name|input2_name" → CraftingRecipe[] */
  byInputPair: Map<string, CraftingRecipe[]>
  /** Map result_name → CraftingRecipe[] */
  byResult: Map<string, CraftingRecipe[]>
  /** Map "type1|type2|mat1|mat2" → MaterialRecipe */
  materialByKey: Map<string, MaterialRecipe>
}

function pairKey(a: string, b: string): string {
  return `${a}|${b}`
}

function materialKey(
  type1: string,
  type2: string,
  mat1: string,
  mat2: string
): string {
  return `${type1}|${type2}|${mat1}|${mat2}`
}

export function buildRecipeIndex(
  recipes: CraftingRecipe[],
  materialRecipes: MaterialRecipe[]
): RecipeIndex {
  const byInputPair = new Map<string, CraftingRecipe[]>()
  const byResult = new Map<string, CraftingRecipe[]>()
  const materialByKey = new Map<string, MaterialRecipe>()

  for (const r of recipes) {
    // Index by input pair (both orderings for swap recipes)
    const key1 = pairKey(r.input_1, r.input_2)
    const list1 = byInputPair.get(key1) ?? []
    list1.push(r)
    byInputPair.set(key1, list1)

    if (r.input_1 !== r.input_2) {
      const key2 = pairKey(r.input_2, r.input_1)
      const list2 = byInputPair.get(key2) ?? []
      list2.push(r)
      byInputPair.set(key2, list2)
    }

    // Index by result
    const rList = byResult.get(r.result) ?? []
    rList.push(r)
    byResult.set(r.result, rList)
  }

  for (const m of materialRecipes) {
    materialByKey.set(
      materialKey(m.input_1, m.input_2, m.material_1, m.material_2),
      m
    )
  }

  return { byInputPair, byResult, materialByKey }
}

// ── Resolve material outcome ─────────────────────────────────────────

function resolveResultMaterial(
  index: RecipeIndex,
  type1: string,
  type2: string,
  mat1: string,
  mat2: string
): MaterialRecipe | null {
  // Try exact match
  const exact = index.materialByKey.get(materialKey(type1, type2, mat1, mat2))
  if (exact) return exact

  // Try swapped types
  const swapped = index.materialByKey.get(materialKey(type2, type1, mat2, mat1))
  if (swapped) return swapped

  // Try same types swapped materials
  const matSwap = index.materialByKey.get(materialKey(type1, type2, mat2, mat1))
  if (matSwap) return matSwap

  return null
}

// ── Convert inventory items to craftable items ───────────────────────

export function inventoryToCraftables(
  items: InventoryItem[],
  blades: Blade[],
  armor: Armor[]
): CraftableItem[] {
  const bladeById = new Map(blades.map((b) => [b.id, b]))
  const armorById = new Map(armor.map((a) => [a.id, a]))

  const result: CraftableItem[] = []

  for (const item of items) {
    if (item.item_type === "blade") {
      const blade = bladeById.get(item.item_id)
      if (!blade) continue
      result.push({
        id: item.id,
        name: blade.name,
        category: "blade",
        equipType: blade.blade_type,
        material: item.material ?? "Iron",
        sourceItem: item,
      })
    } else if (item.item_type === "armor") {
      const a = armorById.get(item.item_id)
      if (!a) continue
      const cat = a.armor_type === "Shield" ? "shield" : "armor"
      result.push({
        id: item.id,
        name: a.name,
        category: cat,
        equipType: a.armor_type,
        material: item.material ?? "Iron",
        sourceItem: item,
      })
    }
    // Skip grips, gems, consumables — they can't be crafted
  }

  return result
}

// ── Forward search: find paths to a target ───────────────────────────

let syntheticIdCounter = -1

export function findCraftingPaths(
  target: { name: string; material: string | null },
  craftables: CraftableItem[],
  index: RecipeIndex,
  config: Partial<OptimizerConfig> = {}
): CraftingPath[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  syntheticIdCounter = -1

  const paths: CraftingPath[] = []

  interface SearchState {
    items: CraftableItem[]
    steps: CraftingStep[]
    consumed: CraftableItem[]
    depth: number
  }

  const queue: SearchState[] = [
    {
      items: craftables.filter((i) => !cfg.excludeItemIds.has(i.id)),
      steps: [],
      consumed: [],
      depth: 0,
    },
  ]

  // Dedup by sorting item names+materials to avoid exploring same state
  const visited = new Set<string>()

  function stateKey(items: CraftableItem[]): string {
    // Use IDs for fast comparison — synthetic items have unique negative IDs
    return items
      .map((i) => i.id)
      .sort((a, b) => a - b)
      .join(",")
  }

  visited.add(stateKey(queue[0].items))

  let statesExplored = 0
  while (
    queue.length > 0 &&
    paths.length < cfg.maxResults &&
    statesExplored < cfg.maxStates
  ) {
    statesExplored++
    const state = queue.shift()!
    if (state.depth >= cfg.maxDepth) continue

    // Group items by category for efficient pairing
    const byCategory = new Map<string, CraftableItem[]>()
    for (const item of state.items) {
      const list = byCategory.get(item.category) ?? []
      list.push(item)
      byCategory.set(item.category, list)
    }

    // Try all pairs within each category
    for (const [, catItems] of byCategory) {
      for (let i = 0; i < catItems.length; i++) {
        for (let j = i + 1; j < catItems.length; j++) {
          const a = catItems[i]
          const b = catItems[j]

          // Look up recipes for this pair
          const recipes = index.byInputPair.get(pairKey(a.name, b.name))
          if (!recipes) continue

          for (const recipe of recipes) {
            // Determine which item is input_1 and which is input_2
            const isForward = recipe.input_1 === a.name
            const input1 = isForward ? a : b
            const input2 = isForward ? b : a

            // Resolve material outcome
            const matRecipe = resolveResultMaterial(
              index,
              input1.equipType,
              input2.equipType,
              input1.material,
              input2.material
            )

            const resultMaterial = matRecipe?.result_material ?? input1.material

            // Create result item
            const resultItem: CraftableItem = {
              id: syntheticIdCounter--,
              name: recipe.result,
              category: recipe.category,
              equipType: input1.equipType, // Result inherits type from input (approximation)
              material: resultMaterial,
              sourceItem: null,
            }

            const step: CraftingStep = {
              input1,
              input2,
              result: resultItem,
              recipe,
              materialRecipe: matRecipe,
              swapped: !isForward,
            }

            const newSteps = [...state.steps, step]
            const newConsumed = [...state.consumed, input1, input2]

            // Check if we reached the target
            const nameMatch = resultItem.name === target.name
            const materialMatch =
              !target.material || resultItem.material === target.material

            if (nameMatch && materialMatch) {
              paths.push({
                steps: newSteps,
                result: resultItem,
                consumedItems: newConsumed,
                score: scorePath(newSteps, newConsumed, resultItem),
              })
              continue
            }

            // Continue searching if depth allows
            if (state.depth + 1 < cfg.maxDepth) {
              // Build new item set: remove consumed, add result
              const newItems = state.items.filter(
                (it) => it.id !== input1.id && it.id !== input2.id
              )
              newItems.push(resultItem)

              const key = stateKey(newItems)
              if (!visited.has(key)) {
                visited.add(key)
                queue.push({
                  items: newItems,
                  steps: newSteps,
                  consumed: newConsumed,
                  depth: state.depth + 1,
                })
              }
            }

            // Also try swap if recipe supports it
            if (recipe.has_swap && recipe.input_1 !== recipe.input_2) {
              const swapMatRecipe = resolveResultMaterial(
                index,
                input2.equipType,
                input1.equipType,
                input2.material,
                input1.material
              )
              const swapMaterial =
                swapMatRecipe?.result_material ?? input2.material

              if (swapMaterial !== resultMaterial) {
                const swapResult: CraftableItem = {
                  id: syntheticIdCounter--,
                  name: recipe.result,
                  category: recipe.category,
                  equipType: input2.equipType,
                  material: swapMaterial,
                  sourceItem: null,
                }

                const swapStep: CraftingStep = {
                  input1: input2,
                  input2: input1,
                  result: swapResult,
                  recipe,
                  materialRecipe: swapMatRecipe,
                  swapped: true,
                }

                const swapSteps = [...state.steps, swapStep]
                const swapConsumed = [...state.consumed, input2, input1]

                const swapNameMatch = swapResult.name === target.name
                const swapMatMatch =
                  !target.material || swapResult.material === target.material

                if (swapNameMatch && swapMatMatch) {
                  paths.push({
                    steps: swapSteps,
                    result: swapResult,
                    consumedItems: swapConsumed,
                    score: scorePath(swapSteps, swapConsumed, swapResult),
                  })
                }
              }
            }
          }
        }
      }
    }
  }

  // Sort by score descending (higher = better)
  return paths.sort((a, b) => b.score - a.score)
}

// ── Reverse search: what can I make from this item? ──────────────────

export interface ReachableItem {
  item: CraftableItem
  path: CraftingStep[]
  depth: number
}

export function findReachableItems(
  sourceItem: CraftableItem,
  craftables: CraftableItem[],
  index: RecipeIndex,
  config: Partial<OptimizerConfig> = {}
): ReachableItem[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  syntheticIdCounter = -1

  const results: ReachableItem[] = []
  const seen = new Set<string>()

  interface SearchState {
    currentItem: CraftableItem
    items: CraftableItem[]
    path: CraftingStep[]
    depth: number
  }

  const queue: SearchState[] = [
    {
      currentItem: sourceItem,
      items: craftables.filter((i) => !cfg.excludeItemIds.has(i.id)),
      path: [],
      depth: 0,
    },
  ]

  let statesExplored = 0
  while (queue.length > 0 && statesExplored < cfg.maxStates) {
    statesExplored++
    const state = queue.shift()!
    if (state.depth >= cfg.maxDepth) continue

    const { currentItem, items } = state

    // Find all same-category items we can pair with
    const partners = items.filter(
      (i) => i.category === currentItem.category && i.id !== currentItem.id
    )

    for (const partner of partners) {
      const recipes = index.byInputPair.get(
        pairKey(currentItem.name, partner.name)
      )
      if (!recipes) continue

      for (const recipe of recipes) {
        const isForward = recipe.input_1 === currentItem.name
        const input1 = isForward ? currentItem : partner
        const input2 = isForward ? partner : currentItem

        const matRecipe = resolveResultMaterial(
          index,
          input1.equipType,
          input2.equipType,
          input1.material,
          input2.material
        )
        const resultMaterial = matRecipe?.result_material ?? input1.material

        const resultKey = `${recipe.result}:${resultMaterial}`
        if (seen.has(resultKey)) continue
        seen.add(resultKey)

        const resultItem: CraftableItem = {
          id: syntheticIdCounter--,
          name: recipe.result,
          category: recipe.category,
          equipType: input1.equipType,
          material: resultMaterial,
          sourceItem: null,
        }

        const step: CraftingStep = {
          input1,
          input2,
          result: resultItem,
          recipe,
          materialRecipe: matRecipe,
          swapped: !isForward,
        }

        const newPath = [...state.path, step]

        results.push({
          item: resultItem,
          path: newPath,
          depth: state.depth + 1,
        })

        // Continue searching from this result
        if (state.depth + 1 < cfg.maxDepth) {
          const newItems = items.filter(
            (it) => it.id !== input1.id && it.id !== input2.id
          )
          newItems.push(resultItem)

          queue.push({
            currentItem: resultItem,
            items: newItems,
            path: newPath,
            depth: state.depth + 1,
          })
        }
      }
    }
  }

  return results.sort((a, b) => a.depth - b.depth)
}

// ── Discover all craftable results from inventory ────────────────────

export interface StatComparison {
  str: number
  int: number
  agi: number
  /** Sum of all stat diffs (positive = overall improvement) */
  total: number
}

export interface CraftableResult {
  result: CraftableItem
  step: CraftingStep
  /** Full path for multi-step results */
  path: CraftingStep[]
  steps: number
  score: number
  materialUpgrade: boolean
  /** Stat diff vs best input (positive = improvement) */
  statDiff: StatComparison | null
}

/**
 * Find all items craftable from the current inventory in one step.
 * Returns deduplicated results ranked by material tier and upgrade potential.
 */
export function findAllCraftableResults(
  craftables: CraftableItem[],
  index: RecipeIndex
): CraftableResult[] {
  syntheticIdCounter = -1
  const results: CraftableResult[] = []
  const seen = new Set<string>()

  for (let i = 0; i < craftables.length; i++) {
    for (let j = i + 1; j < craftables.length; j++) {
      const a = craftables[i]
      const b = craftables[j]
      if (a.category !== b.category) continue

      const recipes = index.byInputPair.get(pairKey(a.name, b.name))
      if (!recipes) continue

      for (const recipe of recipes) {
        const isForward = recipe.input_1 === a.name
        const input1 = isForward ? a : b
        const input2 = isForward ? b : a

        const matRecipe = resolveResultMaterial(
          index,
          input1.equipType,
          input2.equipType,
          input1.material,
          input2.material
        )
        const resultMaterial = matRecipe?.result_material ?? input1.material

        const resultKey = `${recipe.result}:${resultMaterial}`
        if (seen.has(resultKey)) continue
        seen.add(resultKey)

        const resultItem: CraftableItem = {
          id: syntheticIdCounter--,
          name: recipe.result,
          category: recipe.category,
          equipType: input1.equipType,
          material: resultMaterial,
          sourceItem: null,
        }

        const step: CraftingStep = {
          input1,
          input2,
          result: resultItem,
          recipe,
          materialRecipe: matRecipe,
          swapped: !isForward,
        }

        const resultMatTier = MATERIAL_TIER[resultMaterial] ?? 0
        const bestInputMatTier = Math.max(
          MATERIAL_TIER[input1.material] ?? 0,
          MATERIAL_TIER[input2.material] ?? 0
        )
        const materialUpgrade = resultMatTier > bestInputMatTier

        // Score: material tier first, upgrade bonus, penalize consuming high-tier
        const matScore = resultMatTier * 10
        const upgradeBonus = materialUpgrade
          ? 15
          : recipe.tier_change > 0
            ? 5
            : 0
        const inputCost =
          (MATERIAL_TIER[input1.material] ?? 0) +
          (MATERIAL_TIER[input2.material] ?? 0)

        results.push({
          result: resultItem,
          step,
          path: [step],
          steps: 1,
          score: matScore + upgradeBonus - inputCost,
          materialUpgrade,
          statDiff: null,
        })
      }
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

// ── Scoring ──────────────────────────────────────────────────────────

function scorePath(
  steps: CraftingStep[],
  consumed: CraftableItem[],
  result: CraftableItem
): number {
  let score = 0

  // Fewer steps is much better (10 points per step saved vs max)
  score += (5 - steps.length) * 10

  // Higher material tier on result is better
  score += (MATERIAL_TIER[result.material] ?? 0) * 5

  // Prefer consuming lower-tier materials
  for (const item of consumed) {
    score -= (MATERIAL_TIER[item.material] ?? 0) * 2
  }

  // Bonus for upgrade tier changes
  for (const step of steps) {
    score += step.recipe.tier_change * 3
  }

  return score
}

// ── Recipe decomposition tree ────────────────────────────────────────

export interface DecompNode {
  /** Item name */
  name: string
  /** Whether this item exists in the player's inventory */
  available: boolean
  /** The inventory item if available */
  inventoryItem: CraftableItem | null
  /** Recipe that produces this item (null for leaf nodes / inventory items) */
  recipe: CraftingRecipe | null
  /** Input nodes (the two items needed to craft this) */
  inputs: [DecompNode, DecompNode] | null
  /** Depth in the tree (0 = target) */
  depth: number
}

/**
 * Decompose a target item into a recipe tree, showing which ingredients
 * the player has and which are missing.
 *
 * Works backwards from the target: for each item, checks if the player
 * has it in inventory. If not, finds recipes that produce it and recurses.
 */
export function decomposeRecipeTree(
  targetName: string,
  craftables: CraftableItem[],
  index: RecipeIndex,
  maxDepth: number = 3
): DecompNode[] {
  // Build a set of available item names for quick lookup
  const availableByName = new Map<string, CraftableItem[]>()
  for (const c of craftables) {
    const list = availableByName.get(c.name) ?? []
    list.push(c)
    availableByName.set(c.name, list)
  }

  // Find all recipes that produce the target
  const recipes = index.byResult.get(targetName)
  if (!recipes || recipes.length === 0) return []

  const results: DecompNode[] = []

  for (const recipe of recipes) {
    const tree = buildNode(
      targetName,
      recipe,
      availableByName,
      index,
      0,
      maxDepth
    )
    if (tree) results.push(tree)
  }

  // Sort: trees with more available items first (closer to craftable)
  return results.sort((a, b) => {
    const aAvail = countAvailable(a)
    const bAvail = countAvailable(b)
    const aTotal = countTotal(a)
    const bTotal = countTotal(b)
    // Higher ratio of available/total is better
    return bAvail / bTotal - aAvail / aTotal
  })
}

function buildNode(
  name: string,
  recipe: CraftingRecipe | null,
  available: Map<string, CraftableItem[]>,
  index: RecipeIndex,
  depth: number,
  maxDepth: number
): DecompNode | null {
  const inventoryItems = available.get(name)
  const hasItem = inventoryItems && inventoryItems.length > 0

  // If we have the item, it's a leaf
  if (hasItem) {
    return {
      name,
      available: true,
      inventoryItem: inventoryItems[0],
      recipe: null,
      inputs: null,
      depth,
    }
  }

  // If no recipe provided, try to find one
  if (!recipe) {
    // Can't go deeper
    if (depth >= maxDepth) {
      return {
        name,
        available: false,
        inventoryItem: null,
        recipe: null,
        inputs: null,
        depth,
      }
    }

    const recipes = index.byResult.get(name)
    if (!recipes || recipes.length === 0) {
      return {
        name,
        available: false,
        inventoryItem: null,
        recipe: null,
        inputs: null,
        depth,
      }
    }
    // Use the first recipe (simplest heuristic)
    recipe = recipes[0]
  }

  if (depth >= maxDepth) {
    return {
      name,
      available: false,
      inventoryItem: null,
      recipe,
      inputs: null,
      depth,
    }
  }

  // Recursively decompose inputs
  const input1 = buildNode(
    recipe.input_1,
    null,
    available,
    index,
    depth + 1,
    maxDepth
  )
  const input2 = buildNode(
    recipe.input_2,
    null,
    available,
    index,
    depth + 1,
    maxDepth
  )

  if (!input1 || !input2) return null

  return {
    name,
    available: false,
    inventoryItem: null,
    recipe,
    inputs: [input1, input2],
    depth,
  }
}

function countAvailable(node: DecompNode): number {
  if (node.available) return 1
  if (!node.inputs) return 0
  return countAvailable(node.inputs[0]) + countAvailable(node.inputs[1])
}

function countTotal(node: DecompNode): number {
  if (!node.inputs) return 1
  return countTotal(node.inputs[0]) + countTotal(node.inputs[1])
}
