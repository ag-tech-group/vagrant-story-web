import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/accessories/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Accessories</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Equippable accessories — click for details
      </p>
    </div>
  ),
})
