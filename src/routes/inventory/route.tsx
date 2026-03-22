import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/inventory")({
  component: InventoryLayout,
})

function InventoryLayout() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10">
      <div className="text-center">
        <h1 className="text-4xl tracking-wide sm:text-5xl lg:text-6xl">
          Inventory
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create equipment loadouts and track your gear
        </p>
      </div>
      <Outlet />
    </div>
  )
}
