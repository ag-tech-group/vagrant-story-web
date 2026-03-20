import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/sigils/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Sigils</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Magical seals that dissolve arcane door barriers — click for details
      </p>
    </div>
  ),
})
