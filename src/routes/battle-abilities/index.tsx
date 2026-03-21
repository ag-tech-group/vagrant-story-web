import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/battle-abilities/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Battle Abilities</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Chain and defense abilities used in combat — click for details
      </p>
    </div>
  ),
})
