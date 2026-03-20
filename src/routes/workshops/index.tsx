import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/workshops/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Workshops</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Crafting locations throughout Lea Monde — click for details
      </p>
    </div>
  ),
})
