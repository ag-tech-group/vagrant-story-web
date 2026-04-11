import { describe, expect, it } from "vitest"
import {
  buildRecipeIndex,
  findCraftingPaths,
  findReachableItems,
  type CraftableItem,
} from "./crafting-optimizer"
import type { CraftingRecipe, MaterialRecipe } from "./game-api"

// ── Test fixtures ────────────────────────────────────────────────────

const recipes: CraftingRecipe[] = [
  {
    id: 1,
    category: "blade",
    sub_category: "Axe_Axe",
    input_1: "Hand Axe",
    input_2: "Battle Axe",
    result: "Francisca",
    tier_change: 1,
    has_swap: false,
  },
  {
    id: 2,
    category: "blade",
    sub_category: "Axe_Axe",
    input_1: "Francisca",
    input_2: "Hand Axe",
    result: "Tabarzin",
    tier_change: 1,
    has_swap: false,
  },
  {
    id: 3,
    category: "blade",
    sub_category: "Sword_Sword",
    input_1: "Spatha",
    input_2: "Firangi",
    result: "Rhomphaia",
    tier_change: 1,
    has_swap: false,
  },
  {
    id: 4,
    category: "blade",
    sub_category: "Sword_Dagger",
    input_1: "Scramasax",
    input_2: "Spatha",
    result: "Firangi",
    tier_change: 0,
    has_swap: true,
  },
]

const materialRecipes: MaterialRecipe[] = [
  {
    id: 1,
    category: "material",
    sub_category: "Blade_materials",
    input_1: "Axe / Mace",
    input_2: "Axe / Mace",
    material_1: "Iron",
    material_2: "Iron",
    result_material: "Iron",
    tier_change: 0,
  },
  {
    id: 2,
    category: "material",
    sub_category: "Blade_materials",
    input_1: "Axe / Mace",
    input_2: "Axe / Mace",
    material_1: "Hagane",
    material_2: "Iron",
    result_material: "Hagane",
    tier_change: 0,
  },
  {
    id: 3,
    category: "material",
    sub_category: "Blade_materials",
    input_1: "Sword",
    input_2: "Sword",
    material_1: "Silver",
    material_2: "Hagane",
    result_material: "Damascus",
    tier_change: 1,
  },
]

function makeItem(
  id: number,
  name: string,
  equipType: string,
  material: string,
  category = "blade"
): CraftableItem {
  return {
    id,
    name,
    category,
    equipType,
    material,
    sourceItem: null,
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe("buildRecipeIndex", () => {
  it("indexes recipes by input pair", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const result = index.byInputPair.get("Hand Axe|Battle Axe")
    expect(result).toHaveLength(1)
    expect(result![0].result).toBe("Francisca")
  })

  it("indexes both orderings for non-identical inputs", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const forward = index.byInputPair.get("Hand Axe|Battle Axe")
    const reverse = index.byInputPair.get("Battle Axe|Hand Axe")
    expect(forward).toBeDefined()
    expect(reverse).toBeDefined()
    expect(forward![0].id).toBe(reverse![0].id)
  })

  it("indexes recipes by result", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const result = index.byResult.get("Francisca")
    expect(result).toHaveLength(1)
    expect(result![0].input_1).toBe("Hand Axe")
  })

  it("indexes material recipes by key", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const key = "Axe / Mace|Axe / Mace|Iron|Iron"
    expect(index.materialByKey.get(key)).toBeDefined()
    expect(index.materialByKey.get(key)!.result_material).toBe("Iron")
  })
})

describe("findCraftingPaths (forward search)", () => {
  it("finds a 1-step path", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
    ]

    const paths = findCraftingPaths(
      { name: "Francisca", material: null },
      items,
      index
    )

    expect(paths.length).toBeGreaterThanOrEqual(1)
    expect(paths[0].steps).toHaveLength(1)
    expect(paths[0].result.name).toBe("Francisca")
  })

  it("finds a 2-step path", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
      makeItem(3, "Hand Axe", "Axe / Mace", "Iron"),
    ]

    const paths = findCraftingPaths(
      { name: "Tabarzin", material: null },
      items,
      index
    )

    expect(paths.length).toBeGreaterThanOrEqual(1)
    expect(paths[0].steps).toHaveLength(2)
    expect(paths[0].result.name).toBe("Tabarzin")
  })

  it("filters by target material", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
    ]

    const paths = findCraftingPaths(
      { name: "Francisca", material: "Damascus" },
      items,
      index
    )

    // Iron + Iron can't make Damascus, so no paths
    expect(paths).toHaveLength(0)
  })

  it("resolves material outcome from material recipes", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Hagane"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
    ]

    const paths = findCraftingPaths(
      { name: "Francisca", material: "Hagane" },
      items,
      index
    )

    expect(paths.length).toBeGreaterThanOrEqual(1)
    expect(paths[0].result.material).toBe("Hagane")
  })

  it("returns empty array when no path exists", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
    ]

    const paths = findCraftingPaths(
      { name: "Francisca", material: null },
      items,
      index
    )

    // Only 1 item, need 2 to craft
    expect(paths).toHaveLength(0)
  })

  it("respects excludeItemIds", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
    ]

    const paths = findCraftingPaths(
      { name: "Francisca", material: null },
      items,
      index,
      { excludeItemIds: new Set([1]) }
    )

    expect(paths).toHaveLength(0)
  })

  it("prunes unchained steps from multi-step paths", () => {
    // Add a Sword recipe so we can create a disconnected path scenario
    const extraRecipes: CraftingRecipe[] = [
      ...recipes,
      {
        id: 10,
        category: "blade",
        sub_category: "Axe_Axe",
        input_1: "Francisca",
        input_2: "Francisca",
        result: "Tabarzin",
        tier_change: 1,
        has_swap: false,
      },
    ]
    const index = buildRecipeIndex(extraRecipes, materialRecipes)

    // Inventory has 2 pairs that can each make a Francisca, plus an extra
    // Hand Axe that can combine with Francisca to make Tabarzin.
    // The BFS might find: step 1: HandAxe(3)+BattleAxe(4)→Francisca,
    // step 2: HandAxe(1)+BattleAxe(2)→Francisca, then Francisca+HandAxe→Tabarzin
    // But the disconnected step should be pruned.
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
      makeItem(3, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(4, "Battle Axe", "Axe / Mace", "Iron"),
    ]

    const paths = findCraftingPaths(
      { name: "Tabarzin", material: null },
      items,
      index
    )

    // All paths should have only chained steps — no step's result should
    // be unused by a later step
    for (const path of paths) {
      for (let i = 0; i < path.steps.length - 1; i++) {
        const resultId = path.steps[i].result.id
        const usedLater = path.steps
          .slice(i + 1)
          .some((s) => s.input1.id === resultId || s.input2.id === resultId)
        expect(usedLater).toBe(true)
      }
    }
  })

  it("ranks shorter paths higher", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
      makeItem(3, "Francisca", "Axe / Mace", "Iron"),
      makeItem(4, "Hand Axe", "Axe / Mace", "Iron"),
    ]

    // Tabarzin can be reached in 1 step (Francisca + Hand Axe)
    // or 2 steps (Hand Axe + Battle Axe → Francisca, then Francisca + Hand Axe → Tabarzin)
    const paths = findCraftingPaths(
      { name: "Tabarzin", material: null },
      items,
      index
    )

    expect(paths.length).toBeGreaterThanOrEqual(1)
    // 1-step path should score higher
    const oneStep = paths.find((p) => p.steps.length === 1)
    const twoStep = paths.find((p) => p.steps.length === 2)
    if (oneStep && twoStep) {
      expect(oneStep.score).toBeGreaterThan(twoStep.score)
    }
  })
})

describe("findReachableItems (reverse search)", () => {
  it("finds items reachable in 1 step", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
    ]

    const reachable = findReachableItems(items[0], items, index, {
      maxDepth: 1,
    })

    expect(reachable.length).toBeGreaterThanOrEqual(1)
    const names = reachable.map((r) => r.item.name)
    expect(names).toContain("Francisca")
  })

  it("finds items reachable in multiple steps", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
      makeItem(3, "Hand Axe", "Axe / Mace", "Iron"),
    ]

    const reachable = findReachableItems(items[0], items, index, {
      maxDepth: 2,
    })

    const names = reachable.map((r) => r.item.name)
    expect(names).toContain("Francisca")
    expect(names).toContain("Tabarzin")
  })

  it("sorts by depth (closest first)", () => {
    const index = buildRecipeIndex(recipes, materialRecipes)
    const items: CraftableItem[] = [
      makeItem(1, "Hand Axe", "Axe / Mace", "Iron"),
      makeItem(2, "Battle Axe", "Axe / Mace", "Iron"),
      makeItem(3, "Hand Axe", "Axe / Mace", "Iron"),
    ]

    const reachable = findReachableItems(items[0], items, index, {
      maxDepth: 3,
    })

    for (let i = 1; i < reachable.length; i++) {
      expect(reachable[i].depth).toBeGreaterThanOrEqual(reachable[i - 1].depth)
    }
  })
})
