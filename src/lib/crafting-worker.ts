/**
 * Web Worker for crafting optimizer searches.
 * Runs BFS off the main thread to prevent UI freezing.
 */

import {
  buildRecipeIndex,
  findAllCraftableResults,
  findCraftingPaths,
  findReachableItems,
  MATERIAL_TIER,
  type CraftableItem,
  type CraftableResult,
  type CraftingPath,
  type OptimizerConfig,
  type StatComparison,
} from "./crafting-optimizer"
import type {
  Armor,
  Blade,
  CraftingRecipe,
  Material,
  MaterialRecipe,
} from "./game-api"

// ── Message types ────────────────────────────────────────────────────

export interface WorkerRequest {
  type: "discover" | "reverse"
  craftingRecipes: CraftingRecipe[]
  materialRecipes: MaterialRecipe[]
  craftables: CraftableItem[]
  // Game data for stat computation
  blades?: Blade[]
  armor?: Armor[]
  materials?: Material[]
  // Discover-specific
  maxDepth?: number
  // Reverse-specific (find path to target)
  targetName?: string
  targetMaterial?: string | null
  // Config
  config?: Partial<OptimizerConfig>
}

export interface WorkerResponse {
  type: "discover" | "reverse"
  discoverResults?: CraftableResult[]
  reversePaths?: CraftingPath[]
  elapsed: number
}

// ── Stat computation helpers ─────────────────────────────────────────

function getItemBaseStats(
  name: string,
  category: string,
  bladeMap: Map<string, Blade>,
  armorMap: Map<string, Armor>
): { str: number; int: number; agi: number } | null {
  if (category === "blade") {
    const b = bladeMap.get(name)
    return b ? { str: b.str, int: b.int, agi: b.agi } : null
  }
  const a = armorMap.get(name)
  return a ? { str: a.str, int: a.int, agi: a.agi } : null
}

function getMaterialStats(
  materialName: string,
  category: string,
  matMap: Map<string, Material>
): { str: number; int: number; agi: number } {
  const mat = matMap.get(materialName)
  if (!mat) return { str: 0, int: 0, agi: 0 }
  if (category === "blade")
    return { str: mat.blade_str, int: mat.blade_int, agi: mat.blade_agi }
  if (category === "shield")
    return { str: mat.shield_str, int: mat.shield_int, agi: mat.shield_agi }
  return { str: mat.armor_str, int: mat.armor_int, agi: mat.armor_agi }
}

function computeEffective(
  name: string,
  material: string,
  category: string,
  bladeMap: Map<string, Blade>,
  armorMap: Map<string, Armor>,
  matMap: Map<string, Material>
): { str: number; int: number; agi: number } | null {
  const base = getItemBaseStats(name, category, bladeMap, armorMap)
  if (!base) return null
  const matStats = getMaterialStats(material, category, matMap)
  return {
    str: base.str + matStats.str,
    int: base.int + matStats.int,
    agi: base.agi + matStats.agi,
  }
}

function computeStatDiff(
  result: CraftableResult,
  bladeMap: Map<string, Blade>,
  armorMap: Map<string, Armor>,
  matMap: Map<string, Material>
): StatComparison | null {
  const cat = result.result.category
  const resultStats = computeEffective(
    result.result.name,
    result.result.material,
    cat,
    bladeMap,
    armorMap,
    matMap
  )
  if (!resultStats) return null

  // Compare against the best input
  const input1Stats = computeEffective(
    result.step.input1.name,
    result.step.input1.material,
    cat,
    bladeMap,
    armorMap,
    matMap
  )
  const input2Stats = computeEffective(
    result.step.input2.name,
    result.step.input2.material,
    cat,
    bladeMap,
    armorMap,
    matMap
  )

  // Best input = higher total STR+INT+AGI
  const bestInput = [input1Stats, input2Stats]
    .filter(Boolean)
    .sort((a, b) => b!.str + b!.int + b!.agi - (a!.str + a!.int + a!.agi))[0]

  if (!bestInput) return null

  const diff: StatComparison = {
    str: resultStats.str - bestInput.str,
    int: resultStats.int - bestInput.int,
    agi: resultStats.agi - bestInput.agi,
    total: 0,
  }
  diff.total = diff.str + diff.int + diff.agi
  return diff
}

// ── Worker message handler ───────────────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  const start = performance.now()

  const index = buildRecipeIndex(req.craftingRecipes, req.materialRecipes)

  // Build lookup maps for stat computation
  const bladeMap = new Map<string, Blade>()
  for (const b of req.blades ?? []) bladeMap.set(b.name, b)
  const armorMap = new Map<string, Armor>()
  for (const a of req.armor ?? []) armorMap.set(a.name, a)
  const matMap = new Map<string, Material>()
  for (const m of req.materials ?? []) matMap.set(m.name, m)

  if (req.type === "discover") {
    const depth = req.maxDepth ?? 1
    let results: CraftableResult[]

    if (depth <= 1) {
      results = findAllCraftableResults(req.craftables, index)
    } else {
      const seen = new Set<string>()
      results = []
      for (const item of req.craftables) {
        const reachable = findReachableItems(item, req.craftables, index, {
          maxDepth: depth,
          maxResults: 100,
          maxStates: 2000,
        })
        for (const r of reachable) {
          const key = `${r.item.name}:${r.item.material}`
          if (seen.has(key)) continue
          seen.add(key)
          const lastStep = r.path[r.path.length - 1]
          const resultMatTier = MATERIAL_TIER[r.item.material] ?? 0
          const sourceMatTier = MATERIAL_TIER[item.material] ?? 0
          const materialUpgrade = resultMatTier > sourceMatTier
          const matScore = resultMatTier * 10
          const upgradeBonus = materialUpgrade ? 15 : 0
          results.push({
            result: r.item,
            step: lastStep,
            path: r.path,
            steps: r.depth,
            score: matScore + upgradeBonus - r.depth * 3,
            materialUpgrade,
            statDiff: null,
          })
        }
      }
      results.sort((a, b) => b.score - a.score)
    }

    // Compute stat diffs if game data is available
    if (bladeMap.size > 0 || armorMap.size > 0) {
      for (const r of results) {
        r.statDiff = computeStatDiff(r, bladeMap, armorMap, matMap)
        // Boost score based on stat improvement
        if (r.statDiff && r.statDiff.total > 0) {
          r.score += r.statDiff.total * 2
        }
      }
      results.sort((a, b) => b.score - a.score)
    }

    const response: WorkerResponse = {
      type: "discover",
      discoverResults: results,
      elapsed: performance.now() - start,
    }
    self.postMessage(response)
  } else if (req.type === "reverse" && req.targetName) {
    const paths = findCraftingPaths(
      { name: req.targetName, material: req.targetMaterial ?? null },
      req.craftables,
      index,
      {
        maxDepth: req.maxDepth ?? 3,
        maxResults: 20,
        maxStates: 10000,
        ...req.config,
      }
    )
    const response: WorkerResponse = {
      type: "reverse",
      reversePaths: paths,
      elapsed: performance.now() - start,
    }
    self.postMessage(response)
  }
}
