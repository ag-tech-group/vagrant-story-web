/**
 * Web Worker for crafting optimizer searches.
 * Runs BFS off the main thread to prevent UI freezing.
 */

import {
  buildRecipeIndex,
  findCraftingPaths,
  findReachableItems,
  type CraftableItem,
  type CraftingPath,
  type OptimizerConfig,
  type ReachableItem,
} from "./crafting-optimizer"
import type { CraftingRecipe, MaterialRecipe } from "./game-api"

// ── Message types ────────────────────────────────────────────────────

export interface WorkerRequest {
  type: "forward" | "reverse"
  craftingRecipes: CraftingRecipe[]
  materialRecipes: MaterialRecipe[]
  craftables: CraftableItem[]
  // Forward-specific
  targetName?: string
  targetMaterial?: string | null
  // Reverse-specific
  sourceItem?: CraftableItem
  // Config
  config?: Partial<OptimizerConfig>
}

export interface WorkerResponse {
  type: "forward" | "reverse"
  forwardPaths?: CraftingPath[]
  reverseResults?: ReachableItem[]
  elapsed: number
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  const start = performance.now()

  const index = buildRecipeIndex(req.craftingRecipes, req.materialRecipes)

  if (req.type === "forward" && req.targetName) {
    const paths = findCraftingPaths(
      { name: req.targetName, material: req.targetMaterial ?? null },
      req.craftables,
      index,
      { maxDepth: 3, maxResults: 20, maxStates: 10000, ...req.config }
    )
    const response: WorkerResponse = {
      type: "forward",
      forwardPaths: paths,
      elapsed: performance.now() - start,
    }
    self.postMessage(response)
  } else if (req.type === "reverse" && req.sourceItem) {
    const results = findReachableItems(req.sourceItem, req.craftables, index, {
      maxDepth: 2,
      maxResults: 50,
      maxStates: 10000,
      ...req.config,
    })
    const response: WorkerResponse = {
      type: "reverse",
      reverseResults: results,
      elapsed: performance.now() - start,
    }
    self.postMessage(response)
  }
}
