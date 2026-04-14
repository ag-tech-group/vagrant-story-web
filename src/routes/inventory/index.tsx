import { createFileRoute } from "@tanstack/react-router"
import { InventoryListPage } from "@/pages/inventory/inventory-list"

export type InventoryListSearch = {
  tab?: "equipment" | "workbench" | "loadout"
}

const VALID_TABS = new Set(["equipment", "workbench", "loadout"])

export const Route = createFileRoute("/inventory/")({
  component: InventoryListPage,
  validateSearch: (search: Record<string, unknown>): InventoryListSearch => ({
    tab:
      typeof search.tab === "string" && VALID_TABS.has(search.tab)
        ? (search.tab as InventoryListSearch["tab"])
        : undefined,
  }),
})
