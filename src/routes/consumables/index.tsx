import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/consumables/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Consumables</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Items that can be used from inventory — click for details
      </p>
    </div>
  ),
})
