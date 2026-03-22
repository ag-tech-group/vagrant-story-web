import { createFileRoute } from "@tanstack/react-router"
import { InventoryListPage } from "@/pages/inventory/inventory-list"

export const Route = createFileRoute("/inventory/")({
  component: InventoryListPage,
})
