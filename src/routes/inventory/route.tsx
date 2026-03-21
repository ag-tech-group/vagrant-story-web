import { createFileRoute, Outlet } from "@tanstack/react-router"
import { InventoryPage } from "@/pages/inventory/inventory-page"

export const Route = createFileRoute("/inventory")({
  component: InventoryLayout,
})

function InventoryLayout() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <Outlet />
      <InventoryPage />
    </div>
  )
}
