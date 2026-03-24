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
} from "./crafting-optimizer"
import type { CraftingRecipe, MaterialRecipe } from "./game-api"

// ── Message types ────────────────────────────────────────────────────

export interface WorkerRequest {
  type: "discover" | "reverse"
  craftingRecipes: CraftingRecipe[]
  materialRecipes: MaterialRecipe[]
  craftables: CraftableItem[]
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

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  const start = performance.now()

  const index = buildRecipeIndex(req.craftingRecipes, req.materialRecipes)

  if (req.type === "discover") {
    const depth = req.maxDepth ?? 1
    let results: CraftableResult[]

    if (depth <= 1) {
      results = findAllCraftableResults(req.craftables, index)
    } else {
      // For depth > 1, run findReachableItems from each item and convert
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
          // Compare against the original source item's material
          const sourceMatTier = MATERIAL_TIER[item.material] ?? 0
          const materialUpgrade = resultMatTier > sourceMatTier
          const matScore = resultMatTier * 10
          const upgradeBonus = materialUpgrade ? 15 : 0
          results.push({
            result: r.item,
            step: lastStep,
            steps: r.depth,
            score: matScore + upgradeBonus - r.depth * 3,
            materialUpgrade,
          })
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
      { maxDepth: 3, maxResults: 20, maxStates: 10000, ...req.config }
    )
    const response: WorkerResponse = {
      type: "reverse",
      reversePaths: paths,
      elapsed: performance.now() - start,
    }
    self.postMessage(response)
  }
}
