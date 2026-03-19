import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/gems/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Gems</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Gems can be attached to equipment with gem slots — click for details
      </p>
    </div>
  ),
})
