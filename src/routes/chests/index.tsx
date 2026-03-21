import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/chests/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Chests</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        52 treasure chests scattered throughout Lea Monde — click for contents
      </p>
    </div>
  ),
})
