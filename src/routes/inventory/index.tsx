import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/inventory/")({
  component: InventoryIndex,
})

function InventoryIndex() {
  return (
    <div className="text-center">
      <h1 className="text-4xl tracking-wide sm:text-5xl lg:text-6xl">
        Inventory
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Create equipment loadouts and track your gear
      </p>
    </div>
  )
}
