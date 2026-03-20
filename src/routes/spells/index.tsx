import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/spells/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Spells</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Magic spells organized by school — click for details
      </p>
    </div>
  ),
})
