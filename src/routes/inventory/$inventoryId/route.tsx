import { createFileRoute } from "@tanstack/react-router"
import { InventoryDetailPage } from "@/pages/inventory/inventory-detail"

export const Route = createFileRoute("/inventory/$inventoryId")({
  component: InventoryDetailPage,
})
