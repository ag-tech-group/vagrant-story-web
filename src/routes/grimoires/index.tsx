import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/grimoires/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Grimoires</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Spell books that teach magic — click for drop details
      </p>
    </div>
  ),
})
