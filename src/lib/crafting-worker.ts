/**
 * Web Worker for crafting optimizer searches.
 * Runs BFS off the main thread to prevent UI freezing.
 */

import {
  buildRecipeIndex,
  findAllCraftableResults,
  findCraftingPaths,
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
    const results = findAllCraftableResults(req.craftables, index)
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
