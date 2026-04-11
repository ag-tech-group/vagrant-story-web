import { createFileRoute } from "@tanstack/react-router"
import { InventoryDetailPage } from "@/pages/inventory/inventory-detail"

export type InventorySearch = {
  // Equipment tab
  sort?: string
  cat?: string
  // Workbench tab
  wcat?: string
  target?: string
  tmat?: string
  depth?: number
  // Loadout tab
  enemy?: string
  lmode?: string
}

export const Route = createFileRoute("/inventory/$inventoryId")({
  component: InventoryDetailPage,
  validateSearch: (search: Record<string, unknown>): InventorySearch => ({
    sort: typeof search.sort === "string" ? search.sort : undefined,
    cat: typeof search.cat === "string" ? search.cat : undefined,
    wcat: typeof search.wcat === "string" ? search.wcat : undefined,
    target: typeof search.target === "string" ? search.target : undefined,
    tmat: typeof search.tmat === "string" ? search.tmat : undefined,
    depth:
      typeof search.depth === "number"
        ? search.depth
        : typeof search.depth === "string"
          ? parseInt(search.depth, 10) || undefined
          : undefined,
    enemy: typeof search.enemy === "string" ? search.enemy : undefined,
    lmode: typeof search.lmode === "string" ? search.lmode : undefined,
  }),
})
