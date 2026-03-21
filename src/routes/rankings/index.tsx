import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/rankings/")({
  component: () => (
    <div>
      <h1 className="text-3xl tracking-wide sm:text-4xl">Rankings</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Player ranking levels based on accumulated points — click for details
      </p>
    </div>
  ),
})
