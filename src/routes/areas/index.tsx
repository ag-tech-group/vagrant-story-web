import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/areas/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Areas</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Locations throughout Lea Monde — click for rooms and details
      </p>
    </div>
  ),
})
